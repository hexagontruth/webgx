import * as math from '../common/scripts/math.js';

const { floor, random, max, min } = Math;

const MAX_RADIUS = 3072;
const MIN_RADIUS = 16;
const DEFAULT_RADIUS = MAX_RADIUS / 3;
const CELL_STRIDE = 1;
const BUFFER_CHANNELS = 2;
const WORKGROUP_COUNT = MAX_RADIUS / 16;
const DEFAULT_STEPS_PER_FRAME = 1;
const GRID_SIZE = MAX_RADIUS ** 2 * 3;
const BUFFER_SIZE = GRID_SIZE * CELL_STRIDE;

export default (p) => {
  const shader = 'wave-ca.wgsl';

  const uniforms = {
    step: -1,
    maxRadius: MAX_RADIUS,
    gridRadius: DEFAULT_RADIUS,
    wrap: 1.,
    scale: 1,
    interpolate: true,
    subsamples: 1,
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
    blobCount: 64,
    blobSize: 16,
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

  const data = new Int32Array(BUFFER_SIZE);

  const readBuffers = Array(BUFFER_CHANNELS).fill().map(() => {
    return p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_READ' })
  });
  const writeBuffers = Array(BUFFER_CHANNELS).fill().map(() => {
    return p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_WRITE' })
  });

  const dataBuffers = [...readBuffers, ...writeBuffers];

  function setCell(h, v) {
    const idx = math.hexToBufferIdx(h, uniforms.maxRadius);
    data[idx * CELL_STRIDE] = math.pack2x16float(v);
  }

  function blobFill() {
    const blobMax = 2 ** settings.blobMagnitude;
    const blobMin = -blobMax;
    for (let i = 0; i < settings.blobCount; i++) {
      let bufferIdx = floor(random() * GRID_SIZE);
      let h = math.bufferIdxToHex(bufferIdx, MAX_RADIUS);
      let v = (random() * 2 - 1) * blobMax;
      for (let j = 0; j < settings.blobSize; j++) {
        h = math.wrapGrid(h, uniforms.gridRadius);
        v = v + (random() * 2 - 1) * 2 ** (settings.blobMagnitude - 2);
        v = min(blobMax, max(blobMin, v));
        setCell(h, [v, 0]);
        const idx = floor(random() * 6);
        const nbrDelta = nbrs[idx];
        h = h.map((e, i) => e + nbrDelta[i]);
      }
    }
  }

  function resetBoard() {
    uniforms.step = -1;
    uniforms.randomSeed = [0, 0, 0, 0].map(() => random() * 2 - 1);
    p.programUniforms.write('randomSeed', uniforms.randomSeed);
    p.setStatus(uniforms.step);
    data.fill(0);
    for (let i = 1; i < BUFFER_CHANNELS; i++) {
      readBuffers[i].write(data);
    }
    settings.blobSeed && blobFill();
    readBuffers[0].write(data);
  }

  function copyBuffers(e) {
    for (let i = 0; i < BUFFER_CHANNELS; i++) {
      e.copyBufferToBuffer(writeBuffers[i], readBuffers[i]);
    }
  }

  function drawDisplay(e) {
    e.draw(settings.testDisplay ? 'test' : 'main');
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
        // width: 1024,
      },
    },
    controls: {
      gridRadius: [uniforms.gridRadius, MIN_RADIUS, MAX_RADIUS, 1],
      wrap: [uniforms.wrap, 0, 1, 0.001],
      scale: [uniforms.scale, 0.1, 6, 0.001],
      stepsPerFrame: [settings.stepsPerFrame, 1, 64, 1],
      display: {
        interpolate: uniforms.interpolate,
        subsamples: [uniforms.subsamples, 1, 8, 1],
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
        blobSize: [settings.blobSize, 1, 256, 4],
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
            e.compute('compute', WORKGROUP_COUNT, WORKGROUP_COUNT, 3);
            copyBuffers(e);
          }
          p.setStatus(uniforms.step);
          drawDisplay(e);
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
        if (oldVal != val) {
          if (
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
          ) {
            p.reset();
          }
          else if (['testDisplay', 'showGrid', 'interpolate', 'subsamples', 'scale'].includes(key)) {
            p.renderWithEncoder((e) => drawDisplay(e));
          }
        }
      },
    },
    pipelines: {
      compute: p.createComputePipeline(shader, { dataBuffers }),
      main: p.createRenderPipeline(shader, { dataBuffers }),
      test: p.createRenderPipeline(shader, { fragmentMain: 'fragmentTest', dataBuffers, }),
    },
  };
};
