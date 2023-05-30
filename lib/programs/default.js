export default {
  name: 'default',
  settings: {
    dim: 1024,
    interval: 25,
    start: 0,
    stop: 300,
    period: 300,
  },
  actions: {
    main: async (p) => {
      p.render('main');
    },
  },
  generatePipelineDefs: (p) => {
    return {
      main: {
        shader: 'color-test.wgsl',
        drawTexture: null,
      },
      color: {
        shader: 'default.wgsl',
      },
    };
  },
}