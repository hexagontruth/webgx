export default (p) => {
  const { round, random, floor } = Math;
  const SIZE = 256;
  const settings = {
    noiseFactor: 0.05,
    blobCount: SIZE,
    blobSize: 32,
  }

  function wrapCoord(p) {
    return p.map((v) => (v + SIZE) % SIZE);
  }

  function flipCell(data, p) {
    p = wrapCoord(p);
    data[p[0] * SIZE + p[1]] = 1 - data[p[0] * SIZE + p[1]];
  }

  function resetBoard() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < SIZE ** 2; i++) {
      // data[i] = 0;
      data[i] = random() < settings.noiseFactor ? 1 : 0;
    }
    for (let i = 0; i < settings.blobCount; i++) {
      let p = Array(2).fill().map(() => floor(random() * 1024));
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(data, p);
        p = p.map((v) => v + round(random()) * 2 - 1);
      }
    }
    p.dataBuffers[1].write();
  }

  return {
    name: 'default',
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
      blobSize: [settings.blobSize, 0, 64, 4],
      showTest: true,
    },
    uniforms: {
      size: SIZE,
      showTest: 1,
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