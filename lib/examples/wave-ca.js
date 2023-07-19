import * as math from '../common/scripts/math.js';

export default (p) => {
  const shader = 'wave-ca.wgsl';
  const { floor, random, round } = Math;

  const uniforms = {
    bufferSize: 1024,
    gridSize: 120,
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
    workgroupSize: floor(uniforms.bufferSize / 16),
    blobCount: 64,
    blobSize: 8,
    testDisplay: false,
    blobSeed: false,
    gridSize: uniforms.gridSize,
  }

  function setCell(data, c, v) {
    c = math.fromHex(c, uniforms.bufferSize, settings.gridSize, 2);
    data[c[0] * uniforms.bufferSize + c[1]] = v;
  }

  function blobFill() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * uniforms.bufferSize) * 2);
      for (let j = 0; j < settings.blobSize; j++) {
        const h = math.toHex(v, uniforms.bufferSize, settings.gridSize, 2);
        setCell(data, h, Math.random() * 2);
        v = v.map((e) => e + round(random()) * 4 - 2);
      }
    }
  }

  function resetBoard() {
    p.dataBuffers[1].data.fill(0);
    settings.blobSeed && blobFill()
    p.dataBuffers[1].write();
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      period: 60,
      start: 0,
      stop: false,
      output: {
        fps: 60,
        crf: 18,
        width: 1024,
      },
    },
    controls: {
      gridSize: [uniforms.gridSize, 60, floor(uniforms.bufferSize / 2 - 1), 1],
      innerRadius: [uniforms.innerRadius, -1, floor(uniforms.bufferSize / 2 - 1), 1],
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
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      p.createDataBuffer(uniforms.bufferSize ** 2 * 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(uniforms.bufferSize ** 2 * 2, p.DataBuffer.STORAGE_WRITE),
    ],
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: async () => {
        p.compute('compute', settings.workgroupSize, settings.workgroupSize);
        p.copyBufferToBuffer(p.dataBuffers[2], p.dataBuffers[1]);
        p.draw(settings.testDisplay ? 'test' : 'main');
        p.render();
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
              ['blobCount', 'blobSize'].includes(key)
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
      compute: p.createComputePipeline(shader, { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline(shader, { dataBuffers: [1, 2] }),
      test: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentTest',
        dataBuffers: [1, 2],
      }),
    },
  };
};
