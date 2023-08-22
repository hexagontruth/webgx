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
      draw: async () => {
        const encoder = p.createEncoder();
        encoder.draw('test');
        encoder.draw('filter');
        encoder.render();
        encoder.submit();
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
