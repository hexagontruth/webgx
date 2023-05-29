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
      // TODO
      p.run('main').run('color').draw();
    },
  },
  generatePipelineDefs: (p) => {
    return {
      main: {
        shader: 'color-test.wgsl',
      },
      color: {
        shader: 'default.wgsl',
      },
    };
  },
}