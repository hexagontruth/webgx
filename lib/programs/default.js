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
      p.render('test', 0);
      p.render('main', 1);
      p.render('filter', 2);
      p.draw(0);
    },
  },
  generatePipelineDefs: (p) => {
    return {
      test: {
        shader: 'test.wgsl',
      },
      main: {
        shader: 'default.wgsl',
      },
      filter: {
        shader: 'filters/dog.wgsl',
        params: {
          range: 4,
          sd: 2,
          mag: 10,
        },
      },
    };
  },
}