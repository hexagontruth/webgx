import * as math from '../common/scripts/math.js';

export default (p) => {
  const shader = 'wave-ca.wgsl';
  const { floor, random, round } = Math;
  const BUFFER_SIZE = 1024;
  const DEFAULT_GRID_SIZE = 120;
  const DEFAULT_INNER_RADIUS = 60;
  const DEFAULT_COEF = [
    0.05,
    1,
    1,
  ];
  const DEFAULT_INNER_COEF = [
    0.1,
    0.99,
    1,
  ];

  const WORKGROUP_SIZE = floor(BUFFER_SIZE / 16);

  const settings = {
    blobCount: 64,
    blobSize: 8,
    testDisplay: false,
    randomSeed: false,
    gridSize: DEFAULT_GRID_SIZE,
  }

  function setCell(data, c, v) {
    c = math.fromHex(c, BUFFER_SIZE, settings.gridSize, 2);
    data[c[0] * BUFFER_SIZE + c[1]] = v;
  }

  function randomFill() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * BUFFER_SIZE) * 2);
      for (let j = 0; j < settings.blobSize; j++) {
        const h = math.toHex(v, BUFFER_SIZE, settings.gridSize, 2);
        setCell(data, h, Math.random() * 32);
        v = v.map((e) => e + round(random()) * 4 - 2);
      }
    }
  }

  function symmetricFill() {
    const data = p.dataBuffers[1].data;
    const cells = [
      [0, 0, 0],

      [-1, 0, 1],
      [-1, 1, 0],
      [0, 1, -1],
      [1, 0, -1],
      [1, -1, 0],
      [0, -1, 1],

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
      setCell(data, cell, 32);
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
      period: 60,
      stop: true,
      output: {
        crf: 18,
        width: 1024,
      },
    },
    controls: {
      gridSize: [DEFAULT_GRID_SIZE, 60, floor(BUFFER_SIZE / 2 - 1), 1],
      innerRadius: [DEFAULT_INNER_RADIUS, -1, floor(BUFFER_SIZE / 2 - 1), 1],
      wrap: true,
      testDisplay: false,
      randomSeed: false,
      blobCount: [settings.blobCount, 0, 256, 16],
      blobSize: [settings.blobSize, 0, 64, 4],
      coef_0: [DEFAULT_COEF[0], 0, 1, 0.01],
      coef_1: [DEFAULT_COEF[1], 0, 2, 0.01],
      coef_2: [DEFAULT_COEF[2], 0, 2, 0.01],
      innerCoef_0: [DEFAULT_INNER_COEF[0], 0, 1, 0.01],
      innerCoef_1: [DEFAULT_INNER_COEF[1], 0, 2, 0.01],
      innerCoef_2: [DEFAULT_INNER_COEF[2], 0, 2, 0.01],
    },
    uniforms: {
      bufferSize: BUFFER_SIZE,
      gridSize: DEFAULT_GRID_SIZE,
      innerRadius: -1,
      wrap: 1,
      coef: DEFAULT_COEF,
      innerCoef: DEFAULT_INNER_COEF,
    },
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      p.createDataBuffer(BUFFER_SIZE ** 2 * 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(BUFFER_SIZE ** 2 * 2, p.DataBuffer.STORAGE_WRITE),
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
        else if (key.indexOf('_') > 0) {
          const [k, idx] = key.split('_');
          const cur = p.programUniforms.get(k);
          cur[idx] = val;
          p.programUniforms.write(k, cur);
        }
        else if (settings[key] != null) {
          settings[key] = val;
          if (
            key != 'testDisplay' &&
            (settings.randomSeed || !['blobCount', 'blobSize'].includes(key))
          ) {
            p.reset();
          }
        }
      },
    },
    pipelines: {
      compute: p.createComputePipeline(shader, { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline(shader, { dataBuffers: [1, 2] }),
      test: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentTest',
        dataBuffers: [1, 2],
      }),
    },
  };
};
