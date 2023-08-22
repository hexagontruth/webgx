export default (p) => {
  return {
    settings: {
      dim: 2048,
      period: 300,
      start: 0,
      stop: 300,
      output: {},
    },
    media: [],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
          e.draw('test');
          e.draw('filter');
        });
      },
    },
    pipelines: {
      test: p.createRenderPipeline('test.wgsl'),
      filter: p.createRenderPipeline('common/filters/dog.wgsl', {
        params: {
          range: 6,
          sd: 2,
          mag: 8,
        },
      }),
    },
  };
};
