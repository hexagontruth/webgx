export default (p) => {
  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      period: 300,
    },
    controls: {
    },
    uniforms: {
    },
    actions: {
      draw: async () => {
        p.draw('main');
        p.render();
      },
      onControlChange: (key, val) => {
      },
    },
    pipelines: {
      compute: p.createComputePipeline('compute.wgsl'),
      main: p.createRenderPipeline('compute.wgsl'),
    },
  };
};