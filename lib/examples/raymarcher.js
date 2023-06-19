export default (p) => {
  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
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
      reset: () => {
        p.cursorUniforms.set('leftDelta', [0, 0]);
        p.cursorUniforms.set('rightDelta', [0, 0]);
        p.cursorUniforms.update();
      },
      draw: async () => {
        p.render('main', 0);
        p.render('filter', 1);
        p.draw();
      },
      controlChange: (key, val) => {
        p.programUniforms.set(key, Number(val));
        p.programUniforms.update(key);
      }
    },
    pipelines: {
      main: {
        shader: 'raymarcher.wgsl',
      },
      filter: {
        shader: '/examples/raymarcher.wgsl',
        fragmentMain: 'fragmentFilter',
      }
    },
  };
};