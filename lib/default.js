export default (p) => {
  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 1024,
      interval: 25,
      start: 0,
      stop: 120,
      period: 60,
      recordingPeriod: 120,
      texturePairs: 3,
      output: {
        fps: 30,
        crf: 25,
      },
    },
    controls: {
      bgColor: '#000000',
      fgColor: '#ffffff',
      resolution: [10, 0, 10, 0.1],
      animate: true,
      cover: true, // Only has effect for non-square aspect ratio
    },
    uniforms: {
      bgColor: [0, 0, 0, 1],
      fgColor: [1, 1, 1, 1],
      resolution: 10,
      animate: 1,
      cover: 1,
    },
    media: [],
    actions: {
      draw: async () => {
        p.render('logo', 0);
        p.render('trace', 1);
        p.render('filter', 2);
        p.draw();
      },
      controlChange: (key, val) => {
        if (['bgColor', 'fgColor'].includes(key)) {
          p.programUniforms.setColor(key, val);
        }
        else {
          p.programUniforms.set(key, Number(val));
        }
        p.programUniforms.update(key);
      }
    },
    pipelines: {
      logo: {
        shader: '/shaders/default.wgsl',
      },
      trace: {
        shader: '/shaders/filters/trace.wgsl',
        params: {
          scale: 11/12,
          hueShift: 0.25,
        },
      },
      filter: {
        shader: '/shaders/filters/dog.wgsl',
        params: {
          range: 4,
          sd: 2,
          mag: 10,
        },
      },
    },
  };
};