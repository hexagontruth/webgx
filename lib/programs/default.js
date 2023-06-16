export default (p) => {
  return {
    name: 'default',
    settings: {
      dim: 1024,
      interval: 25,
      start: 0,
      stop: 180,
      period: 60,
      texturePairs: 3,
      output: {
        fps: 30,
        crf: 25,
      },
    },
    controls: {
      bgColor: '#000000',
      fgColor: '#ffffff',
      resolution: [60, 1, 720, 0.1],
    },
    uniforms: {
      bgColor: [0, 0, 0, 1],
      fgColor: [1, 1, 1, 1],
      resolution: 60,
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
          p.programUniforms.set(key, val);
        }
        p.programUniforms.update(key);
      }
    },
    pipelines: {
      logo: {
        shader: 'logo.wgsl',
      },
      trace: {
        shader: 'filters/trace.wgsl',
        params: {
          scale: 11/12,
          hueShift: 0.25,
        },
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