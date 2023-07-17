export default (p) => {
  return {
    settings: {
      dim: 2048,
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
        p.draw('test', 0);
        p.draw('filter', 1);
        p.render();
      },
    },
    pipelines: {
      test: p.createRenderPipeline('test.wgsl'),
      filter: p.createRenderPipeline('common/filters/dog.wgsl', {
        params: {
          range: 8,
          sd: 2,
          mag: 8,
        },
      }),
    },
  };
};
