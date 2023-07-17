export default (p) => {
  const { abs, floor, random, round, sign } = Math;
  const BUFFER_SIZE = 256;
  const GRID_SIZE = 60;
  const settings = {
    noiseFactor: 0.05,
    blobCount: 1024,
    blobSize: 64,
  }

  function toHex(p) {
    p = p.map((e) => e - BUFFER_SIZE / 2);
    p = p.map((e) => e % (GRID_SIZE + 1));
    p = abs(p[0] + p[1]) > GRID_SIZE ? p.map((e) => -GRID_SIZE * sign(e) + e) : p;
    return p;
  }

  function fromHex(p) {
    p = p.map((e) => e % (GRID_SIZE + 1));
    p = abs(p[0] + p[1]) > GRID_SIZE ? p.map((e) => -GRID_SIZE * sign(e) + e) : p;
    p = p.map((e) => e + BUFFER_SIZE / 2);
    return p;
  }

  function flipCell(data, p) {
    p = fromHex(p);
    const idx = p[0] * BUFFER_SIZE + p[1];
    data[idx] = 1 - data[idx];
  }

  function resetBoard() {
    const data = p.dataBuffers[1].data;
    data.fill(0);
    for (let i = 0; i < settings.blobCount; i++) {
      let p = Array(2).fill().map(() => floor(random() * BUFFER_SIZE));
      p = toHex(p);
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
      output: {
        crf: 20,
        width: 1024,
      }
    },
    controls: {
      noiseFactor: [settings.noiseFactor, 0, 1, 0.05],
      blobCount: [settings.blobCount, 0, 1024, 16],
      blobSize: [settings.blobSize, 0, 64, 4],
    },
    uniforms: {
      size: BUFFER_SIZE,
    },
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      p.createDataBuffer(BUFFER_SIZE ** 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(BUFFER_SIZE ** 2, p.DataBuffer.STORAGE_WRITE),
    ],
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: async () => {
        p.compute('compute', BUFFER_SIZE / 16, BUFFER_SIZE / 16);
        p.copyBufferToBuffer(p.dataBuffers[2], p.dataBuffers[1]);
        // p.draw('main');
        p.draw('test');
        p.render();
      },
      onControlChange: (key, val) => {
        settings[key] = val;
        p.reset();
      },
    },
    pipelines: {
      compute: p.createComputePipeline('hex-ca.wgsl', { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline('hex-ca.wgsl', { dataBuffers: [1, 2] }),
      test: p.createRenderPipeline('hex-ca.wgsl', {
        fragmentMain: 'fragmentTest',
        dataBuffers: [1, 2],
      }),
    },
  };
};
