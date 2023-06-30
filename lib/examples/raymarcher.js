export default (p) => {
  return {
    name: 'raymarcher',
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      interval: 25,
      start: 0,
      stop: true,
      period: 300,
      renderPairs: 2,
      output: {
        fps: 30,
        crf: 15,
        width: 1024,
      },
    },
    controls: {
      color: '#808080',
      specular: [6, 0, 10, 1],
      rotX: [0, -1, 1, 0.25],
      rotY: [0, -1, 1, 0.25],
      rotZ: [1, -1, 1, 0.25],
      truncation: [0.5, 1/3, 1, 1/12],
      thiccness: [0.4, 0, 2, 0.1],
      scale: [1, 0.5, 2, 0.25],
      speed: [1, 0, 4, 0.125],
      filter: false,
    },
    uniforms: {
      color: [0.5, 0.5, 0.5, 1], // Close enough
      specular: 6,
      rotX: 0,
      rotY: 0,
      rotZ: 1,
      truncation: 0.5,
      thiccness: 0.4,
      scale: 1,
      speed: 1,
    },
    actions: {
      draw: async () => {
        p.draw('main', 0);
        p.controlData.filter && p.draw('filter', 1);
        p.render();
      },
      onControlChange: (key, val) => {
        if (key != 'filter') {
          p.programUniforms.write(key, val);
        }
      },
      onCursor: () => {
        p.refresh();
      },
    },
    pipelines: {
      main: p.createRenderPipeline('raymarcher.wgsl'),
      filter: p.createRenderPipeline('raymarcher.wgsl'),
    },
  };
};