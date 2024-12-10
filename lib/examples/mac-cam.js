import * as macTextures from '../common/scripts/mac-textures.js';

const { floor, log2, round } = Math;

const shader = 'mac-cam.wgsl';

const MAX_RES_FACTOR = 9;
const MIN_RES_FACTOR = 3;
const DIM = 2 ** MAX_RES_FACTOR;
const BUFFER_SIZE = DIM ** 2 * 4;
const MIP_LEVELS = MAX_RES_FACTOR - MIN_RES_FACTOR + 1;

export default (p) => {
  const uniforms = {
    scale: 1,
    resFactor: 6,
    blackLevel: 0,
    whiteLevel: 1,
    includeSolidRange: true,
    color: false,
    test: false,
  };
  const readBuffer = p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_READ' });
  const writeBuffer = p.createDataBuffer(BUFFER_SIZE, { usage: 'STORAGE_WRITE' });
  const dataBuffers = [readBuffer, writeBuffer];

  const macTexture = p.createTexture([48, 48]);

  macTextures.textureByteArrays.forEach((typedArray, i) => {
    const origin = [
      (i % 6) * 8,
      (5 - floor(i / 6)) * 8,
      0,
    ];
    p.device.queue.writeTexture(
      { texture: macTexture, origin },
      typedArray,
      { bytesPerRow: 32, rowsPerImage: 8 },
      [8, 8, 1],
    );
  });

  return {
    settings: {
      dim: DIM,
      period: 240,
      start: 0,
      stop: true,
      output: {
        width: DIM,
      },
    },
    controls: {
      scale: [uniforms.scale, 0, 1, 0.01],
      resFactor: [uniforms.resFactor, MIN_RES_FACTOR, MAX_RES_FACTOR, 1],
      blackLevel: [uniforms.blackLevel, 0, 1, 0.01],
      whiteLevel: [uniforms.whiteLevel, 0, 1, 0.01],
      includeSolidRange: uniforms.includeSolidRange,
      color: uniforms.color,
      test: uniforms.test,
    },
    uniforms,
    textures: [macTexture],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
          let wgSize = 4;
          let dim = DIM;
          let minRes = 2 ** uniforms.resFactor;
          e.compute('computeTexture', dim / wgSize, dim / wgSize);
          e.copyBufferToBuffer(writeBuffer, readBuffer);
          while (dim / 2 >= minRes) {
            dim /= 2;
            e.compute('computeBuffer', dim / wgSize, dim / wgSize);
            e.copyBufferToBuffer(writeBuffer, readBuffer);
          }
          e.draw('main');
        });
      },
      onControlChange: (key, val) => {
        if (uniforms[key] != null) {
          uniforms[key] = val;
          p.programUniforms.write(key, val);
          p.actions.draw();
        }
      },
    },
    pipelines: {
      main: p.createRenderPipeline(shader, { dataBuffers }),
      computeTexture: p.createComputePipeline(shader, {
        computeMain: 'computeTexture',
        dataBuffers,
      }),
      computeBuffer: p.createComputePipeline(shader, {
        computeMain: 'computeBuffer',
        dataBuffers,
      }),
    },
  };
};
