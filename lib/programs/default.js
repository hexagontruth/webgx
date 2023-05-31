export default {
  name: 'default',
  settings: {
    dim: 1024,
    interval: 25,
    start: 0,
    stop: 300,
    period: 300,
    texturePairs: 3,
    output: {
      fps: 30,
      dim: 720,
    },
    resources: [
      'blarg.png',
    ]
  },
  actions: {
    main: async (p) => {
      p.render('main', 0);
      p.render('color', 1);
      p.render('filter', 2);
      p.draw(2);
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
      filter: {
        shader: 'filters/dog.wgsl',
      },
    };
  },
}