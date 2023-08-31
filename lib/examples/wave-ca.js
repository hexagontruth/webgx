import * as math from '../common/scripts/math.js';

export default (p) => {
  const shader = 'wave-ca.wgsl';
  const { floor, random, round } = Math;

  const uniforms = {
    bufferDim: 1024,
    gridRadius: 120,
    innerRadius: 60,
    scale: 1,
    wrap: true,
    pulse: true,
    centerSeed: false,
    edgeSeed: false,
    pulseInterval: 60,
    pulseMagnitude: -4,
    centerRadius: 1,
    centerMagnitude: 1,
    edgeRadius: 1,
    edgeMagnitude: -2,
    coef: [
      0.05,
      1,
      1,
    ],
    innerCoef: [
      0.1,
      0.99,
      1,
    ],
  };

  const settings = {
    workgroupSize: floor(uniforms.bufferDim / 16),
    blobCount: 64,
    blobSize: 8,
    blobMagnitude: 1,
    testDisplay: false,
    blobSeed: false,
    gridRadius: uniforms.gridRadius,
  };

  const data = new Uint32Array(uniforms.bufferDim ** 2 * 2);
  const readBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_WRITE' });

  function setCell(data, c, v) {
    c = math.fromHex(c, uniforms.bufferDim, 2);
    data[c[0] * uniforms.bufferDim + c[1]] = v;
  }

  function blobFill() {
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * uniforms.bufferDim) * 2);
      v = math.toHex(v, uniforms.bufferDim);
      v = math.wrapGrid(v, uniforms.gridRadius);
      for (let j = 0; j < settings.blobSize; j++) {
        setCell(data, v, random() * 2 ** settings.blobMagnitude);
        v = v.map((e) => e + round(random()) * 4 - 2);
        v = math.wrapGrid(v, uniforms.gridRadius);
      }
    }
  }

  function resetBoard() {
    data.fill(0);
    settings.blobSeed && blobFill();
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
        width: 1024,
      },
    },
    controls: {
      gridRadius: [uniforms.gridRadius, 60, floor(uniforms.bufferDim / 2 - 1), 1],
      innerRadius: [uniforms.innerRadius, -1, floor(uniforms.bufferDim / 2 - 1), 1],
      scale: [uniforms.scale, 0.1, 6, 0.1],
      wrap: uniforms.wrap,
      testDisplay: settings.testDisplay,
      pulse: uniforms.pulse,
      pulseInterval: [uniforms.pulseInterval, 10, 360, 10],
      pulseMagnitude: [uniforms.pulseMagnitude, -8, 8, 1],
      seeds: {
        blobSeed: settings.blobSeed,
        blobCount: [settings.blobCount, 0, 256, 16],
        blobSize: [settings.blobSize, 0, 64, 4],
        blobMagnitude: [settings.blobMagnitude, -8, 8, 1],
        centerSeed: uniforms.centerSeed,
        centerRadius: [uniforms.centerRadius, 0, 60, 1],
        centerMagnitude: [uniforms.centerMagnitude, -8, 8, 1],
        edgeSeed: uniforms.edgeSeed,
        edgeRadius: [uniforms.edgeRadius, 1, 60, 1],
        edgeMagnitude: [uniforms.edgeMagnitude, -8, 8, 1],
      },
      coefSettings: {
        coef_0: [uniforms.coef[0], 0, 1, 0.01],
        coef_1: [uniforms.coef[1], 0, 2, 0.01],
        coef_2: [uniforms.coef[2], 0, 2, 0.01],
        innerCoef_0: [uniforms.innerCoef[0], 0, 1, 0.01],
        innerCoef_1: [uniforms.innerCoef[1], 0, 2, 0.01],
        innerCoef_2: [uniforms.innerCoef[2], 0, 2, 0.01],
      },
    },
    uniforms,
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: () => {
        p.renderWithEncoder((e) => {
          e.compute('compute', settings.workgroupSize, settings.workgroupSize);
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
        else if (key.indexOf('_') > 0) {
          const [k, idx] = key.split('_');
          const arrayVal = p.programUniforms.get(k);
          arrayVal[idx] = val;
          uniforms[k] = arrayVal;
          p.programUniforms.write(k, arrayVal);
        }
        if (
            ['blobSeed', 'centerSeed', 'edgeSeed'].includes(key) ||
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
