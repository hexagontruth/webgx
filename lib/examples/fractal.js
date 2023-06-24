export default (p) => {
  return {
    name: 'default',
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      autoplay: false,
      interval: 25,
      start: 0,
      stop: true,
      period: 360,
      renderPairs: 2,
      output: {
        fps: 30,
        crf: 15,
        width: 1024,
      },
    },
    controls: {
    },
    uniforms: {
    },
    actions: {
      draw: async () => {
        p.render('main', 0);
        // p.render('filter', 1);
        p.draw();
      },
      onControlChange: (key, val) => {
        p.programUniforms.update(key, val);
      }
    },
    pipelines: {
      main: {
        shader: 'fractal.wgsl',
      },
      filter: {
        shader: 'fractal.wgsl',
        fragmentMain: 'fragmentFilter',
      }
    },
  };
};