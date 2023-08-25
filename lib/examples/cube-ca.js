import * as math from '../common/scripts/math.js';

export default (p) => {
  const shader = 'cube-ca.wgsl';
  const { floor, random, round } = Math;

  const BUFFER_DIM = 64;
  const uniforms = {
    bufferDim: BUFFER_DIM,
    bufferSize: BUFFER_DIM ** 3,
    numStates: 8,
    colorDisplay: false,
  };

  const settings = {
    testDisplay: false,
    blobSeed: false,
    blobCount: 64,
    blobSize: 8,
  };

  const data = new Float32Array(uniforms.bufferSize);
  const readBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(data.length, { usage: 'STORAGE_WRITE' });

  function fromCube(v) {
    return v[0] * uniforms.bufferDim ** 2 + v[1] * uniforms.bufferDim + v[2];
  }

  function mod(n, m) {
    if (!Array.isArray(n)) {
      return mod([n], m);
    }
    else {
      return n.map((e) => (e + m) % m);
    }
  }

  function flipCell(v) {
    const idx = fromCube(v);
    data[idx] = 1 - data[idx];
  }

  function blobFill() {
    for (let i = 0; i < settings.blobCount; i++) {
      let v = [0, 0, 0].map(() => floor(random() * uniforms.bufferDim));
      for (let j = 0; j < settings.blobSize; j++) {
        flipCell(v);
        v = v.map((e) => e + round(random()) * 2 - 1);
        v = mod(v);
      }
    }
  }

  function symmetricFill() {
    const cells = [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ];
    for (let cell of cells) {
      flipCell(cell.map((e) => e + uniforms.bufferDim / 2 - 1));
    }
  }

  function resetBoard() {
    data.fill(0);
    settings.blobSeed ? blobFill() : symmetricFill();
    readBuffer.write(data);
  }

  return {
    settings: {
      dim: 512,
      // dim: [1080, 1920],
      // exportDim: 1024,
      period: 300,
      start: 0,
      // stop: true,
      output: {
        width: 1024,
        // fps: 10,
      },
    },
    controls: {
      numStates: [uniforms.numStates, 2, 64, 1],
      testDisplay: settings.testDisplay,
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
      draw: () => {
        p.renderWithEncoder((e) => {
          e.compute('compute', 16, 16, 16);
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
