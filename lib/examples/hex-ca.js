export default (p) => {
  const { abs, floor, random, round, sign } = Math;
  const BUFFER_SIZE = 256;
  const DEFAULT_GRID_SIZE = 60;
  const DEFAULT_NUM_STATES = 8;
  const WORKGROUP_SIZE = floor(BUFFER_SIZE / 16);

  const settings = {
    blobCount: 32,
    blobSize: 4,
    testDisplay: false,
    randomSeed: false,
  }

  const sr3 = 3 ** 0.5;

  const hex2hexMat = [
    1./3.,          1./3. - 1/sr3,  1./3. + 1/sr3,
    1./3. + 1/sr3,  1./3.,          1./3. - 1/sr3,
    1./3. - 1/sr3,  1./3. + 1/sr3,  1./3.,
  ];

  function hex2hex(v) {
    const m = hex2hexMat;
    return v.map((_, i) => {
      const col = i * 3;
      return v[0] * m[col] + v[1] * m[col + 1] + v[2] * m[col + 2];
    });
  }

  function hex2hexT(v) {
    const m = hex2hexMat;
    return v.map((_, i) => {
      return v[0] * m[i] + v[1] * m[i + 3] + v[2] * m[i + 6];
    });
  }

  function roundCubic(v) {
    const r = v.map((e) => round(e));
    const [x, y, z] = v.map((e, i) => abs(e - r[i]));
    if (x > y && x > z) {
      r[0] = -r[1] - r[2];
    }
    else if (y > z) {
      r[1] = -r[2] - r[0];
    }
    else {
      r[2] = -r[0] - r[1];
    }
    return r;
  }

  function wrapHex(v) {
    const gridSize = p.programUniforms.get('gridSize');
    v = hex2hex(v);
    v = v.map((e) => e / gridSize / sr3);
    const r = roundCubic(v);
    v = v.map((e, i) => e - r[i]);
    v = v.map((e) => e * sr3 * gridSize);
    v = hex2hexT(v);
    v = roundCubic(v);
    return v;
  }

  function toHex(v) {
    v = v.map((e) => e - BUFFER_SIZE / 2);
    v = wrapHex(v);
    return v;
  }

  function fromHex(v) {
    v = wrapHex(v);
    v = v.map((e) => e + BUFFER_SIZE / 2);
    return v;
  }

  function flipCell(data, v) {
    v = fromHex(v);
    const idx = v[0] * BUFFER_SIZE + v[1];
    data[idx] = 1 - data[idx];
  }

  function randomFill() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * BUFFER_SIZE));
      v = toHex(v);
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
        else {
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
