import * as math from '../common/scripts/math.js';

export default (p) => {
  const { floor, random, round } = Math;
  const BUFFER_SIZE = 256;
  const DEFAULT_GRID_SIZE = 60;
  const DEFAULT_NUM_STATES = 8;
  const WORKGROUP_SIZE = floor(BUFFER_SIZE / 16);

  const settings = {
    blobCount: 32,
    blobSize: 4,
    testDisplay: false,
    randomSeed: false,
    gridSize: DEFAULT_GRID_SIZE,
  }

  function flipCell(data, v) {
    v = math.fromHex(v, BUFFER_SIZE, settings.gridSize);
    const idx = v[0] * BUFFER_SIZE + v[1];
    data[idx] = 1 - data[idx];
  }

  function randomFill() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * BUFFER_SIZE));
      v = math.toHex(v, BUFFER_SIZE, settings.gridSize);
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(data, v);
        v = v.map((e) => e + round(random()) * 2 - 1);
      }
    }
  }

  function symmetricFill() {
    const data = p.dataBuffers[1].data;
    const cells = [
      [0, 0, 0],

      // [-1, 0, 1],
      // [-1, 1, 0],
      // [0, 1, -1],
      // [1, 0, -1],
      // [1, -1, 0],
      // [0, -1, 1],

      [-2, 1, 1],
      [-1, 2, -1],
      [1, 1, -2],
      [2, -1, -1],
      [1, -2, 1],
      [-1, -1, 2],

      [-2, 0, 2],
      [-2, 2, 0],
      [0, 2, -2],
      [2, 0, -2],
      [2, -2, 0],
      [0, -2, 2],
    ];
    for (let cell of cells) {
      flipCell(data, cell);
    }
  }

  function resetBoard() {
    p.dataBuffers[1].data.fill(0);
    settings.randomSeed ? randomFill() : symmetricFill();
    p.dataBuffers[1].write();
  }

  return {
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      period: 300,
      stop: true,
      output: {
        crf: 18,
        width: 1024,
      },
    },
    controls: {
      gridSize: [DEFAULT_GRID_SIZE, 5, floor(BUFFER_SIZE / 2 - 1), 1],
      numStates: [DEFAULT_NUM_STATES, 2, 64, 1],
      testDisplay: false,
      colorDisplay: false,
      randomSeed: false,
      blobCount: [settings.blobCount, 0, 256, 16],
      blobSize: [settings.blobSize, 0, 64, 4],
    },
    uniforms: {
      bufferSize: BUFFER_SIZE,
      gridSize: DEFAULT_GRID_SIZE,
      numStates: DEFAULT_NUM_STATES,
      colorDisplay: false,
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
        p.compute('compute', WORKGROUP_SIZE, WORKGROUP_SIZE);
        p.copyBufferToBuffer(p.dataBuffers[2], p.dataBuffers[1]);
        p.draw(settings.testDisplay ? 'test' : 'main');
        p.render();
      },
      onControlChange: (key, val) => {
        if (p.programUniforms.dataKeys.includes(key)) {
          p.programUniforms.write(key, val);
        }
        else if (settings[key] != null) {
          settings[key] = val;
          if (
            settings.randomSeed ||
            !['blobCount', 'blobSize'].includes(key)
          ) {
            p.reset();
          }
        }
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
