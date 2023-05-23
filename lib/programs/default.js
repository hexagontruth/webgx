export default {
  name: 'default',
  pipelines: {
    main: {
      vertexData: new Float32Array([
        0, 0, 0, 1, 1, 0, 0, 1,
        -0.5, 0, 0, 1, 0, 1, 0, 1,
        0, 1, 0, 1, 0, 0, 1, 1,
        1, 1, 0, -0.1, 1, 1, 0, 1,
      ]),
      vertexBuffers: [
        {
          attributes: [
            {
              shaderLocation: 0, // position
              offset: 0,
              format: 'float32x4',
            },
            {
              shaderLocation: 1, // color
              offset: 16,
              format: "float32x4",
            },
          ],
          arrayStride: 32,
          stepMode: 'vertex',
        },
      ],
      shader: '/data/shaders/default.wgsl',
    },
  },
}