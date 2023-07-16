export default (p) => {
  const { round, random, floor } = Math;
  const SIZE = 256;
  const BLOB_COUNT = 256;
  const BLOB_SIZE = 32;

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
      data[i] = random() > 0.95 ? 1 : 0;
    }
    for (let i = 0; i < BLOB_COUNT; i++) {
      let p = Array(2).fill().map(() => floor(random() * 1024));
      flipCell(data, p);
      for (let j = 0; j < BLOB_SIZE; j++) {
        p = p.map((v) => v + round(random()) * 2 - 1);
        flipCell(data, p);
      }
    }
    p.dataBuffers[1].write();
  }

  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: SIZE,
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
    },
    uniforms: {
      size: SIZE,
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
      },
    },
    pipelines: {
      compute: p.createComputePipeline('compute.wgsl', { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline('compute.wgsl', { dataBuffers: [1, 2] }),
    },
  };
};