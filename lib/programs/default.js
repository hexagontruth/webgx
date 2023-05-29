export default {
  name: 'default',
  settings: {
    dim: 1024,
    interval: 25,
    start: 0,
    stop: 300,
    period: 300,
  },
  actions: {
    main: (p) => {
      p.run();
    },
  },
  generatePipelineDefs: (p) => {
    return {
      main: {
        vertexData: new Float32Array([
          -1, -1, 0, 1,
          1, -1, 0, 1,
          -1, 1, 0, 1,
          1, 1, 0, 1,
        ]),
        vertexBuffers: [
          {
            attributes: [
              {
                shaderLocation: 0, // position
                offset: 0,
                format: 'float32x4',
              },
              // {
              //   shaderLocation: 1, // color
              //   offset: 16,
              //   format: "float32x4",
              // },
            ],
            arrayStride: 16,
            stepMode: 'vertex',
          },
        ],
        shader: 'edge.wgsl',
      },
    };
  },
}