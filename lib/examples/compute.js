export default (p) => {
  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      period: 300,
      // topology: 'triangle-list',
    },
    controls: {
    },
    uniforms: {
    },
    dataBuffers: [
      p.createDefaultVertexBuffer(),
      // p.createIndexBuffer([1, 2, 3]),
    ],
    actions: {
      draw: async () => {
        p.draw('main');
        // p.drawIndexed('main', 1);
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