export default (p) => {
  const SIZE = 1024;
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
      p.createDataBuffer(SIZE ** 2, p.DataBuffer.STORAGE_READ),
      p.createDataBuffer(SIZE ** 2, p.DataBuffer.STORAGE_WRITE),
    ],
    actions: {
      draw: async () => {
        p.compute('compute', 8, 8);
        // p.copyBufferToBuffer(p.dataBuffers[2], p.dataBuffers[1]);
        p.draw('main');
        // p.drawIndexed('main', 1);
        p.render();
      }, 
      onControlChange: (key, val) => {
      },
    },
    pipelines: {
      compute: p.createComputePipeline('compute.wgsl', { dataBuffers: [1, 2] }),
      main: p.createRenderPipeline('compute.wgsl'),
    },
  };
};