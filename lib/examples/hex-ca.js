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

  const data = new Float32Array(uniforms.bufferDim ** 2);
  const readBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_WRITE' });

  function flipCell(v) {
    v = math.fromHex(v, uniforms.bufferDim);
    const idx = v[0] * uniforms.bufferDim + v[1];
    data[idx] = 1 - data[idx];
  }

  function randomFill() {
    for (let i = 0; i < settings.blobCount; i++) {
      let v = Array(2).fill().map(() => floor(random() * uniforms.bufferDim));
      v = math.toHex(v, uniforms.bufferDim);
      v = math.wrapGrid(v, uniforms.gridRadius);
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(v);
        v = v.map((e) => e + round(random()) * 2 - 1);
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
    settings.blobSeed ? randomFill() : symmetricFill();
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
      defaultNumVerts: 4,
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
    actions: {
      reset: () => {
        resetBoard();
      },
      draw: async () => {
        const encoder = p.createEncoder();
        encoder.compute('compute', settings.workgroupSize, settings.workgroupSize);
        encoder.copyBufferToBuffer(writeBuffer, readBuffer);
        encoder.draw(settings.testDisplay ? 'test' : 'main');
        encoder.render();
        encoder.submit();
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
