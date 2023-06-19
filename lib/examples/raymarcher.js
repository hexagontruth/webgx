export default (p) => {
  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 2024,
      interval: 25,
      start: 0,
      stop: true,
      period: 360,
      renderPairs: 2,
      output: {
        fps: 60,
        crf: 20,
      },
    },
    controls: {
    },
    uniforms: {
    },
    actions: {
      draw: async () => {
        p.render('main', 0);
        p.draw();
      },
      controlChange: (key, val) => {
        p.programUniforms.set(key, Number(val));
        p.programUniforms.update(key);
      }
    },
    pipelines: {
      main: {
        shader: '/examples/raymarcher.wgsl',
      },
    },
  };
};