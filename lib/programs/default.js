export default {
  name: 'default',
  settings: {
    dim: 1024,
    interval: 25,
    start: 0,
    stop: 300,
    period: 300,
    texturePairs: 2,
  },
  actions: {
    main: async (p) => {
      p.render('main');
      p.render('color');
      p.draw();
    },
  },
  generatePipelineDefs: (p) => {
    return {
      main: {
        shader: 'color-test.wgsl',
      },
      color: {
        shader: 'default.wgsl',
      },
    };
  },
}