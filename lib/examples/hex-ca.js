import * as math from '../common/scripts/math.js';

const { floor, random } = Math;

const MAX_RADIUS = 512;
const MIN_RADIUS = 8;
const DEFAULT_RADIUS = 64
const WORKGROUP_COUNT = MAX_RADIUS / 16;
const GRID_SIZE = MAX_RADIUS ** 2 * 3;

export default (p) => {
  const shader = 'hex-ca.wgsl';

  const uniforms = {
    maxRadius: MAX_RADIUS,
    gridRadius: DEFAULT_RADIUS,
    scale: 1,
    numStates: 8,
    colorDisplay: false,
  };

  const settings = {
    blobSeed: false,
    blobCount: 16,
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

  const data = new Float32Array(GRID_SIZE);
  const readBuffer = p.createDataBuffer(GRID_SIZE, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(GRID_SIZE, { usage: 'STORAGE_WRITE' });

  function flipCell(v) {
    const idx = math.hexToBufferIdx(v, uniforms.maxRadius);
    data[idx] = 1 - data[idx];
  }

  function blobFill() {
    for (let i = 0; i < settings.blobCount; i++) {
      let bufferIdx = floor(random() * GRID_SIZE);
      let h = math.bufferIdxToHex(bufferIdx, MAX_RADIUS);
      for (let j = 0; j < settings.blobSize; j++) {
        h = math.wrapGrid(h, uniforms.gridRadius);
        flipCell(h);
        const idx = floor(random() * 6);
        const nbrDelta = nbrs[idx];
        h = h.map((e, i) => e + nbrDelta[i]);
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
      testDisplay: settings.testDisplay,
      colorDisplay: uniforms.colorDisplay,
      blobSeed: settings.blobSeed,
      blobCount: [settings.blobCount, 1, 256, 1],
      blobSize: [settings.blobSize, 4, 64, 1],
    },
    uniforms,
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: () => {
        p.renderWithEncoder((e) => {
          e.compute('compute', WORKGROUP_COUNT, WORKGROUP_COUNT, 3);
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
