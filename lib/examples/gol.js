export default (p) => {
  const { floor, random, round } = Math;
  const SIZE = 256;
  const settings = {
    noiseFactor: 0.05,
    blobCount: SIZE,
    blobSize: 32,
  };

  const data = new Float32Array(SIZE ** 2);
  const readBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_WRITE' });

  function wrapCoord(p) {
    return p.map((e) => (e + SIZE) % SIZE);
  }

  function flipCell(p) {
    p = wrapCoord(p);
    const idx = p[0] * SIZE + p[1];
    data[idx] = 1 - data[idx];
  }

  function resetBoard() {
    for (let i = 0; i < SIZE ** 2; i++) {
      // data[i] = 1;
      data[i] = random() < settings.noiseFactor ? 1 : 0;
    }
    for (let i = 0; i < settings.blobCount; i++) {
      let p = Array(2).fill().map(() => floor(random() * SIZE));
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(p);
        p = p.map((v) => v + round(random()) * 2 - 1);
      }
    }
    readBuffer.write(data);
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      period: 300,
      output: {
        width: SIZE,
      },
    },
    controls: {
      noiseFactor: [settings.noiseFactor, 0, 1, 0.05],
      blobCount: [settings.blobCount, 0, 1024, 16],
      blobSize: [settings.blobSize, 0, 128, 4],
      showTest: false,
    },
    uniforms: {
      size: SIZE,
      showTest: 0,
    },
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: async () => {
        p.renderWithEncoder((e) => {
          e.compute('compute', SIZE / 16, SIZE / 16);
          e.copyBufferToBuffer(writeBuffer, readBuffer);
          e.draw('main');
        });
      },
      onControlChange: (key, val) => {
        if (key == 'showTest') {
          p.programUniforms.write(key, val);
        }
        else {
          settings[key] = val;
          p.reset();
        }
      },
    },
    pipelines: {
      compute: p.createComputePipeline('gol.wgsl', { dataBuffers: [readBuffer, writeBuffer] }),
      main: p.createRenderPipeline('gol.wgsl', { dataBuffers: [readBuffer, writeBuffer] }),
    },
  };
};
