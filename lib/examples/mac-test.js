import * as macTextures from '../common/scripts/mac-textures.js';

const { floor } = Math;

export default (p) => {
  const uniforms = {
    scale: 1,
    resolution: 90,
    blackLevel: 0,
    whiteLevel: 1,
    valueMultiply: 0,
  };
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
      dim: 720,
      period: 150,
      start: 0,
      stop: true,
      output: {},
    },
    controls: {
      scale: [uniforms.scale, 0, 1, 0.01],
      resolution: [uniforms.resolution, 30, 360, 5],
      blackLevel: [uniforms.blackLevel, 0, 1, 0.01],
      whiteLevel: [uniforms.whiteLevel, 0, 1, 0.01],
      valueMultiply: [uniforms.valueMultiply, 0, 1, 0.01],
    },
    uniforms,
    textures: [texture],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
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
      main: p.createRenderPipeline('mac-test.wgsl'),
    },
  };
};
