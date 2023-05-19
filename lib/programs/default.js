export default {
  curd: 'wedge',
  pipelines: {
    main: {
      vertexData: new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]),
      shader: '/data/shaders/default.wgsl',
    },
  },
}