import * as math from '../common/scripts/math.js';

export default (p) => {
  const shader = 'hex-ca.wgsl';
  const { floor, random, round } = Math;

  const uniforms = {
    bufferDim: 256,
    gridRadius: 60,
    numStates: 8,
    colorDisplay: false,
  };

  const settings = {
    workgroupSize: floor(uniforms.bufferDim / 16),
    blobSeed: false,
    blobCount: 64,
    blobSize: 8,
    testDisplay: false,
  }

  function flipCell(data, v) {
    v = math.fromHex(v, uniforms.bufferDim);
    const idx = v[0] * uniforms.bufferDim + v[1];
    data[idx] = 1 - data[idx];
  }

  function randomFill() {
    const data = p.dataBuffers[1].data;
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * uniforms.bufferDim));
      v = math.toHex(v, uniforms.bufferDim);
      v = math.wrapGrid(v, uniforms.gridRadius);
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(data, v);
        v = v.map((e) => e + round(random()) * 2 - 1);
        v = math.wrapGrid(v, uniforms.gridRadius);
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
    settings.blobSeed ? randomFill() : symmetricFill();
    p.dataBuffers[1].write();
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      period: 300,
      stop: true,
      output: {
        crf: 18,
        width: 1024,
      },
    },
    controls: {
      gridRadius: [uniforms.gridRadius, 5, floor(uniforms.bufferDim / 2 - 1), 1],
      numStates: [uniforms.numStates, 2, 64, 1],
      testDisplay: uniforms.testDisplay,
      colorDisplay: uniforms.colorDisplay,
      blobSeed: settings.blobSeed,
      blobCount: [settings.blobCount, 0, 256, 16],
      blobSize: [settings.blobSize, 0, 64, 4],
    },
    uniforms,
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      p.createDataBuffer(uniforms.bufferDim ** 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(uniforms.bufferDim ** 2, p.DataBuffer.STORAGE_WRITE),
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
      compute: p.createComputePipeline(shader, { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline(shader, { dataBuffers: [1, 2] }),
      test: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentTest',
        dataBuffers: [1, 2],
      }),
    },
  };
};
