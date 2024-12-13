import * as macTextures from '../common/scripts/mac-textures.js';

const { floor, log2, round } = Math;

const shader = 'mac-cam.wgsl';

const MAX_RES_FACTOR = 9;
const MIN_RES_FACTOR = 3;
const RES = 2 ** MAX_RES_FACTOR;
const BUFFER_SIZE = RES ** 2 * 4;

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

  const texture = p.createTexture([48, 48]);
  const typedArrays = macTextures.textureByteArrays;
  typedArrays.forEach((typedArray, i) => {
    const origin = [
      (i % 6) * 8,
      (5 - floor(i / 6)) * 8,
      0,
    ];
    p.device.queue.writeTexture(
      { texture, origin },
      typedArray,
      { bytesPerRow: 32, rowsPerImage: 8 },
      [8, 8, 1],
    );
  });
  return {
    settings: {
      dim: RES,
      period: 240,
      start: 0,
      stop: true,
      output: {
        width: RES,
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
    textures: [texture],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
          let wgSize = 4;
          let res = RES;
          let minRes = 2 ** uniforms.resFactor;
          e.compute('computeTexture', res / wgSize, res / wgSize);
          e.copyBufferToBuffer(writeBuffer, readBuffer);
          while (res / 2 >= minRes) {
            res /= 2;
            e.compute('computeBuffer', res / wgSize, res / wgSize);
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
