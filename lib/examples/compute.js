export default (p) => {
  const { floor, random, round } = Math;
  const SIZE = 256;
  const settings = {
    noiseFactor: 0.05,
    blobCount: SIZE,
    blobSize: 32,
  }

  function wrapCoord(p) {
    return p.map((e) => (e + SIZE) % SIZE);
  }

  function flipCell(data, p) {
    p = wrapCoord(p);
    const idx = p[0] * SIZE + p[1];
    data[idx] = 1 - data[idx];
  }

  function resetBoard() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < SIZE ** 2; i++) {
      // data[i] = 0;
      data[i] = random() < settings.noiseFactor ? 1 : 0;
    }
    for (let i = 0; i < settings.blobCount; i++) {
      let p = Array(2).fill().map(() => floor(random() * SIZE));
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(data, p);
        p = p.map((v) => v + round(random()) * 2 - 1);
      }
    }
    p.dataBuffers[1].write();
  }

  return {
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      period: 600,
      stop: true,
      // topology: 'triangle-list',
      output: {
        fps: 30,
        crf: 12,
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
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      p.createDataBuffer(SIZE ** 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(SIZE ** 2, p.DataBuffer.STORAGE_WRITE),
    ],
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: async () => {
        p.compute('compute', SIZE / 16, SIZE / 16);
        p.copyBufferToBuffer(p.dataBuffers[2], p.dataBuffers[1]);
        p.draw('main');
        // p.drawIndexed('main', 1);
        p.render();
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
      compute: p.createComputePipeline('compute.wgsl', { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline('compute.wgsl', { dataBuffers: [1, 2] }),
    },
  };
};
