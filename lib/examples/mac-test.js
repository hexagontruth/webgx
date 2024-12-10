import * as macTextures from '../common/scripts/mac-textures.js';

const { floor } = Math;

export default (p) => {
  const texture = p.createTexture([48, 48]);
  const typedArrays = macTextures.textureByteArrays;
  typedArrays.forEach((typedArray, i) => {
    const origin = [
      (i % 6) * 8,
      floor(i / 6) * 8,
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
