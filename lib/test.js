export default (p) => {
  return {
    name: 'test',
    settings: {
      dim: 1024,
      interval: 25,
      start: 0,
      stop: 300,
      period: 300,
      renderPairs: 2,
      output: {},
    },
    media: [],
    actions: {
      draw: async () => {
        p.render('test', 0);
        p.render('filter', 1);
        p.draw();
      },
    },
    pipelines: {
      test: {
        shader: 'test.wgsl',
      },
      filter: {
        shader: 'common/filters/dog.wgsl',
        params: {
          range: 4,
          sd: 2,
          mag: 10,
        },
      },
    },
  };
};