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
      p.createDataBuffer([
        0, 1, 2, 3, 4, 5, 6, 7,
      ]),
      p.createDataBuffer([
        0, 0, 0, 0, 0, 0, 0, 0,
      ], p.DataBuffer.MAP_READ),
    ],
    actions: {
      draw: async () => {
        p.compute('compute', 2, 2, 2);
        p.draw('main');
        // p.drawIndexed('main', 1);
        p.render();
      },
      onControlChange: (key, val) => {
      },
    },
    pipelines: {
      compute: p.createComputePipeline('compute.wgsl', { dataBuffers: [1] }),
      main: p.createRenderPipeline('compute.wgsl'),
    },
  };
};