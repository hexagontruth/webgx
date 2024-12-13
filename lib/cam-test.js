export default (p) => {
  return {
    settings: {
      dim: 2048,
      period: 300,
      start: 0,
      stop: 300,
      swapPairs: 2,
      output: {},
    },
    media: [],
    actions: {
      draw: () => {
        p.renderWithEncoder((e) => {
          e.drawSwap('main', 0);
        });
      },
    },
    pipelines: {
      main: p.createRenderPipeline('cam-test.wgsl'),
    },
  };
};
