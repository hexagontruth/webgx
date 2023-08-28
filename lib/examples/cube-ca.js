import * as math from '../common/scripts/math.js';

export const features = [];

export default (p) => {
  const shader = 'cube-ca.wgsl';
  const { floor, random, round } = Math;

  const BUFFER_DIM = 64;
  const uniforms = {
    bufferDim: BUFFER_DIM,
    bufferSize: BUFFER_DIM ** 3,
    numStates: 64,
    displayMin: 32,
    sizeMax: 1,
    rotX: 0,
    rotY: 1,
    rotZ: 0,
  };

  const settings = {
    testDisplay: false,
    blobSeed: false,
    blobCount: 4,
    blobSize: 4,
  };

  const vertices = [
    [0, 0, 0, 1], //0
    [0, 0, 1, 1], //1
    [0, 1, 0, 1], //2
    [0, 1, 1, 1], //3
    [1, 0, 0, 1], //4
    [1, 0, 1, 1], //5
    [1, 1, 0, 1], //6
    [1, 1, 1, 1], //7
  ];

  const triangles = [
    [0, 2, 3],
    [3, 1, 0],

    [7, 6, 4],
    [4, 5, 7],

    [0, 4, 5],
    [5, 1, 0],

    [2, 3, 7],
    [7, 6, 2],

    [0, 2, 6],
    [6, 4, 0],

    [1, 3, 7],
    [7, 5, 1],
  ];

  const normals = [
    [1, 0, 0, 0],
    [-1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, -1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, -1, 0],
  ];

  // This is so awkward
  const vertexData = [];
  for (let i = 0; i < 12; i++) {
    const triangle = triangles[i];
    const normal = normals[floor(i / 2)];
    for (let j = 0; j < 3; j++) {
      vertexData.push(...vertices[triangle[j]]);
      vertexData.push(...normal);
    }
  }

  const vertBuffer = p.createVertexBuffer(vertexData.length, [4, 4]);
  vertBuffer.write(vertexData);

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
      dim: 2048,
      // dim: [1080, 1920],
      // exportDim: 1024,
      period: 360,
      start: 0,
      stop: true,
      output: {
        width: 600,
        fps: 30,
        crf: 20,
      },
    },
    controls: {
      numStates: [uniforms.numStates, 2, 64, 1],
      displayMin: [uniforms.displayMin, 1, 64, 1],
      sizeMax: [uniforms.sizeMax, 1, 16, 1],
      testDisplay: settings.testDisplay,
      blobSeed: settings.blobSeed,
      blobCount: [settings.blobCount, 1, 64, 1],
      blobSize: [settings.blobSize, 1, 16, 1],
      rotX: [uniforms.rotX, -1, 1, 0.25],
      rotY: [uniforms.rotY, -1, 1, 0.25],
      rotZ: [uniforms.rotZ, -1, 1, 0.25],
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
          if (settings.testDisplay) {
            e.draw('test');
          }
          else {
            e.draw('background');
            e.draw('main', null, uniforms.bufferSize);
          }
          p.clearTexture(p.drawTexture);
        });
      },
      onControlChange: (key, val) => {
        if (uniforms[key] != null) {
          uniforms[key] = val;
          p.programUniforms.write(key, val);
        }
        else if (settings[key] != null) {
          settings[key] = val;
          if (key == 'testDisplay') {
            p.refresh();
          }
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
      background: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentBackground',
      }),
      main: p.createRenderPipeline(shader, {
        vertexMain: 'vertexCube',
        topology: 'triangle-list',
        depthTest: true,
        vertexBuffers: [vertBuffer],
        dataBuffers: [readBuffer],
        bufferVisibility: GPUShaderStage.VERTEX,
      }),
      test: p.createRenderPipeline(shader, {
        fragmentMain: 'fragmentTest',
        dataBuffers: [readBuffer, writeBuffer],
      }),
    },
  };
};
