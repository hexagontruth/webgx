export default (p) => {
  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      // autoplay: false,
      // exportDim: 1024,
      period: 300,
      start: 0,
      // stop: true,
      output: {
        // width: 1024,
      },
    },
    controls: {
      power: [2, 1, 7, 0.1],
      innerScale: [1.75, 1, 4, 0.25],
      outerScale: [0, -10, 10, 0.01],
    },
    uniforms: {
      power: 2,
      innerScale: 1.75,
      outerScale: 0,
    },
    actions: {
      reset: () => {
        p.run('onControlChange', 'outerScale', 1);
      },
      draw: async () => {
        p.renderWithEncoder((e) => {
          e.draw('main');
        });
      },
      onControlChange: (key, val) => {
        p.programUniforms.write(key, val);
        if (key == 'outerScale') {
          p.cursorUniforms.write('scrollDelta', val);
        }
      },
      onCursor: () => {
        p.controllers.outerScale.setValue(p.cursorUniforms.get('scrollDelta'));
        p.refresh();
      },
    },
    pipelines: {
      main: p.createRenderPipeline('fractal.wgsl'),
    },
  };
};
