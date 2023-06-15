export default (p) => {
  return {
    name: 'default',
    settings: {
      dim: 1024,
      interval: 25,
      start: 0,
      stop: 300,
      period: 300,
      texturePairs: 2,
      output: {
        // fps: 30,
        // width: 720,
        // crf: 20,
      },
    },
    media: [],
    actions: {
      draw: async () => {
        p.render('test', 0);
        p.render('filter', 1);
        p.draw(1);
      },
      reset: async () => {
        // p.media[0].media.currentTime = 0;
      },
    },
    pipelines: {
      test: {
        shader: 'test.wgsl',
      },
      filter: {
        shader: 'filters/dog.wgsl',
        params: {
          range: 4,
          sd: 2,
          mag: 10,
        },
      },
    },
  };
};