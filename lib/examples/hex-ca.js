import * as math from '../common/scripts/math.js';

const { floor, random } = Math;

const CELL_DIM = 4096;
const WORKGROUP_COUNT = CELL_DIM / 16;
const DEFAULT_RADIUS = 64
const MIN_RADIUS = 1;
const MAX_RADIUS = floor(CELL_DIM / 2);
const BUFFER_SIZE = CELL_DIM ** 2;

export default (p) => {
  const shader = 'hex-ca.wgsl';

  const uniforms = {
    cellDim: CELL_DIM,
    gridRadius: DEFAULT_RADIUS,
    scale: 1,
    numStates: 8,
    colorDisplay: false,
  };

  const settings = {
    blobSeed: false,
    blobCount: 64,
    blobSize: 8,
    testDisplay: false,
  };

  const nbrs = [
    [ 1,  0, -1],
    [ 0,  1, -1],
    [-1,  1,  0],
    [-1,  0,  1],
    [ 0, -1,  1],
    [ 1, -1,  0],
  ];

  const data = new Float32Array(BUFFER_SIZE);
  const readBuffer = p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_WRITE' });

  function flipCell(v) {
    v = math.fromHex(v, uniforms.cellDim);
    const idx = v[0] * uniforms.cellDim + v[1];
    data[idx] = 1 - data[idx];
  }

  function blobFill() {
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * CELL_DIM));
      v = math.toHex(v, CELL_DIM);
      v = math.wrapGrid(v, uniforms.gridRadius);
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(v);
        const idx = floor(random() * 6);
        const nbrDelta = nbrs[idx];
        v = v.map((e, i) => e + nbrDelta[i]);
        v = math.wrapGrid(v, uniforms.gridRadius);
      }
    }
  }

  function symmetricFill() {
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
      flipCell(cell);
    }
  }

  function resetBoard() {
    data.fill(0);
    settings.blobSeed ? blobFill() : symmetricFill();
    readBuffer.write(data);
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      // exportDim: 1024,
      period: 300,
      start: 0,
      // stop: true,
      output: {
        // width: 1024,
      },
    },
    controls: {
      gridRadius: [uniforms.gridRadius, MIN_RADIUS, MAX_RADIUS, 1],
      scale: [uniforms.scale, 0.1, 6, 0.001],
      numStates: [uniforms.numStates, 2, 16, 1],
      testDisplay: uniforms.testDisplay,
      colorDisplay: uniforms.colorDisplay,
      blobSeed: settings.blobSeed,
      blobCount: [settings.blobCount, 1, 256, 1],
      blobSize: [settings.blobSize, 3, 64, 1],
    },
    uniforms,
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: () => {
        p.renderWithEncoder((e) => {
          e.compute('compute', WORKGROUP_COUNT, WORKGROUP_COUNT);
          e.copyBufferToBuffer(writeBuffer, readBuffer);
          e.draw(settings.testDisplay ? 'test' : 'main');
        });
      },
      onControlChange: (key, val) => {
        if (uniforms[key] != null) {
          uniforms[key] = val;
          p.programUniforms.write(key, val);
        }
        else if (settings[key] != null) {
          settings[key] = val;
        }
        if (
          key == 'blobSeed' ||
          settings.blobSeed &&
          ['blobCount', 'blobSize'].includes(key)
        ) {
          p.reset();
        }
      },
    },
    pipelines: {
      compute: p.createComputePipeline(shader, { dataBuffers: [readBuffer, writeBuffer] }),
      main: p.createRenderPipeline(shader, { dataBuffers: [readBuffer, writeBuffer] }),
      test: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentTest',
        dataBuffers: [readBuffer, writeBuffer],
      }),
    },
  };
};
