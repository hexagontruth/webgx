import * as math from '../common/scripts/math.js';
import * as macTextures from '../common/scripts/mac-textures.js';

export default (p) => {
  const texture = p.createTexture([48, 48]);
  const typedArrays = macTextures.textureByteArrays;
  for (let typedArray of typedArrays) {
    p.device.queue.writeTexture(
      { texture, origin: [0, 0, 0] },
      typedArray,
      { bytesPerRow: 32, rowsPerImage: 8 },
      [8, 8, 1],
    );
  }
  return {
    settings: {
      dim: 1024,
      period: 300,
      start: 0,
      stop: 300,
      output: {},
    },
    textures: [texture],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
          e.draw('main');
        });
      },
    },
    pipelines: {
      main: p.createRenderPipeline('mac-test.wgsl'),
    },
  };
};
