import * as math from '../common/scripts/math.js';

const { floor, random, max, min } = Math;

const CELL_DIM = 2048;
const CELL_STRIDE = 4;
const WORKGROUP_SIZE = CELL_DIM / 16;
const DEFAULT_STEPS_PER_FRAME = 1;
const DEFAULT_RADIUS = CELL_DIM / 2;
const MIN_RADIUS = 1;
const MAX_RADIUS = floor(CELL_DIM / 2);
const BUFFER_SIZE = CELL_DIM ** 2 * CELL_STRIDE;

export default (p) => {
  const shader = 'wave-new.wgsl';

  const uniforms = {
    step: -1,
    cellDim: CELL_DIM,
    gridRadius: DEFAULT_RADIUS,
    wrap: 1.,
    scale: 1,
    interpolateCells: true,
    showGrid: false,
    pulse: false,
    pulseMinRadius: 0,
    pulseMaxRadius: DEFAULT_RADIUS / 2,
    pulseFrequency: 64,
    pulseMagnitude: -6,
    noiseSeed: false,
    noiseDepth: 4,
    noiseMagnitude: 0,
    centerSeed: true,
    centerRadius: DEFAULT_RADIUS / 2,
    centerMagnitude: 0,
    edgeSeed: false,
    edgeRadius: 1,
    edgeMagnitude: 0,
    randomSeed: [0, 0, 0, 0],
    waveCoefs: [
      0.4444 / 1,
      1,
      1,
    ],
  };

  const settings = {
    stepsPerFrame: DEFAULT_STEPS_PER_FRAME,
    blobSeed: false,
    blobCount: 256,
    blobSize: 64,
    blobMagnitude: 1,
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

  function setCell(c, v) {
    c = math.fromHex(c, CELL_DIM);
    const idx = (c[0] * CELL_DIM + c[1]) * CELL_STRIDE;
    data[idx] = v;
  }

  function blobFill() {
    const blobMax = 2 ** settings.blobMagnitude;
    const blobMin = -blobMax;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * CELL_DIM));
      let mag = (random() * 2 - 1) * blobMax;
      v = math.toHex(v, CELL_DIM);
      v = math.wrapGrid(v, uniforms.gridRadius);
      for (let j = 0; j < settings.blobSize; j++) {
        mag = mag + (random() * 2 - 1) * 2 ** (settings.blobMagnitude - 2);
        mag = min(blobMax, max(blobMin, mag));
        setCell(v, mag);
        const idx = floor(random() * 6);
        const nbrDelta = nbrs[idx];
        v = v.map((e, i) => e + nbrDelta[i]);
        v = math.wrapGrid(v, uniforms.gridRadius);
      }
    }
  }

  function resetBoard() {
    uniforms.step = -1;
    uniforms.randomSeed = [0, 0, 0, 0].map(() => random() * 2 - 1);
    p.programUniforms.write('randomSeed', uniforms.randomSeed);
    p.setStatus(uniforms.step);
    data.fill(0);
    settings.blobSeed && blobFill();
    readBuffer.write(data);
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      // exportDim: 1200,
      period: 300,
      start: 0,
      // stop: true,
      output: {
        fps: 30,
        width: 720,
      },
    },
    controls: {
      gridRadius: [uniforms.gridRadius, MIN_RADIUS, MAX_RADIUS, 1],
      wrap: [uniforms.wrap, 0, 1, 0.001],
      scale: [uniforms.scale, 0.1, 6, 0.001],
      stepsPerFrame: [settings.stepsPerFrame, 1, 64, 1],
      test: {
        interpolateCells: uniforms.interpolateCells,
        showGrid: uniforms.showGrid,
        testDisplay: settings.testDisplay,
      },
      pulse: {
        pulse: uniforms.pulse,
        pulseMinRadius: [uniforms.pulseMinRadius, 0, MAX_RADIUS, 1],
        pulseMaxRadius: [uniforms.pulseMaxRadius, 0, MAX_RADIUS, 1],
        pulseFrequency: [uniforms.pulseFrequency, 2, 1024, 1],
        pulseMagnitude: [uniforms.pulseMagnitude, -10, 0, 1],
      },
      seeds: {
        blobSeed: settings.blobSeed,
        blobCount: [settings.blobCount, 1, 1024, 1],
        blobSize: [settings.blobSize, 0, 256, 4],
        blobMagnitude: [settings.blobMagnitude, -8, 8, 1],
        noiseSeed: uniforms.noiseSeed,
        noiseDepth: [uniforms.noiseDepth, 1, 32, 1],
        noiseMagnitude: [uniforms.noiseMagnitude, -4, 4, 1],
        centerSeed: uniforms.centerSeed,
        centerRadius: [uniforms.centerRadius, 0, MAX_RADIUS, 1],
        centerMagnitude: [uniforms.centerMagnitude, -8, 8, 1],
        edgeSeed: uniforms.edgeSeed,
        edgeRadius: [uniforms.edgeRadius, 1, MAX_RADIUS, 1],
        edgeMagnitude: [uniforms.edgeMagnitude, -8, 8, 1],
      },
      coefs: {
        waveCoefs_0: [uniforms.waveCoefs[0], 0, 1, 0.0001],
        waveCoefs_1: [uniforms.waveCoefs[1], 0, 2, 0.0001],
        waveCoefs_2: [uniforms.waveCoefs[2], 0, 2, 0.0001],
      },
    },
    uniforms,
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: () => {
        p.renderWithEncoder((e) => {
          const loops = uniforms.step == -1 ? 1 : settings.stepsPerFrame;
          for (let i = 0; i < loops; i++) {
            uniforms.step ++;
            p.programUniforms.write('step', uniforms.step);
            e.compute('compute', WORKGROUP_SIZE, WORKGROUP_SIZE);
            e.copyBufferToBuffer(writeBuffer, readBuffer);
          }
          p.setStatus(uniforms.step);
          e.draw(settings.testDisplay ? 'test' : 'main');
        });
      },
      onControlChange: (key, val, old) => {
        let oldVal;
        if (uniforms[key] != null) {
          oldVal = uniforms[key];
          uniforms[key] = val;
          p.programUniforms.write(key, val);
        }
        else if (settings[key] != null) {
          oldVal = settings[key];
          settings[key] = val;
        }
        else if (key.indexOf('_') > -1) {
          const [k, idx] = key.split('_');
          const arrayVal = p.programUniforms.get(k);
          arrayVal[idx] = val;
          uniforms[k] = arrayVal;
          p.programUniforms.write(k, arrayVal);
        }
        if (oldVal != val && (
          ['noiseSeed', 'blobSeed', 'centerSeed', 'edgeSeed'].includes(key) ||
          (
            settings.blobSeed &&
            ['blobCount', 'blobSize', 'blobMagnitude'].includes(key)
          ) ||
          (
            uniforms.centerSeed &&
            ['centerRadius', 'centerMagnitude'].includes(key)
          ) ||
          (
            uniforms.edgeSeed &&
            ['edgeRadius', 'edgeMagnitude'].includes(key)
          )
        )) {
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
