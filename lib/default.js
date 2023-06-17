export default (p) => {
  return {
    name: 'default',
    settings: {
      dim: [1080, 1920],
      dim: 2048,
      interval: 25,
      start: 0,
      stop: 120,
      period: 60,
      renderPairs: 3,
      output: {
        fps: 30,
        crf: 25,
      },
    },
    controls: {
      period: [60, 0, 360, 1],
      bgColor: '#000000',
      fgColor: '#ffffff',
      saturation: [1.5, 0, 4, 0.01],
      resolution: [10, 0, 10, 0.1],
      pulse: false,
      animate: true,
      cover: true, // Only has effect for non-square aspect ratio,
      filter: {
        sd: [4, 0, 16, 0.1],
        range: [8, 0, 32, 1],
        magnitude: [10, 0, 64, 0.1],
        scale: [1.1, 0, 2, 0.01],
      },
      grid: {
        rows: [6, 1, 24, 1],
        cols: [12, 1, 24, 1],
        cycleX: [0, -1, 1, 1],
        cycleY: [1, -1, 1, 1],
      }
    },
    uniforms: {
      bgColor: [0, 0, 0, 1],
      fgColor: [1, 1, 1, 1],
      saturation: 1.5,
      resolution: 10,
      pulse: 0,
      animate: 1,
      cover: 1,
      sd: 4,
      range: 8,
      magnitude: 10,
      scale: 1.1,
      rows: 6,
      cols: 12,
      cycleX: 0,
      cycleY: 1,
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
        const uniforms = p.programUniforms.dataMap[key] ? p.programUniforms : p.globalUniforms;
        if (['bgColor', 'fgColor'].includes(key)) {
          uniforms.setColor(key, val);
        }
        else {
          uniforms.set(key, Number(val));
        }
        uniforms.update(key);
      }
    },
    pipelines: {
      logo: {
        shader: '/shaders/default.wgsl',
      },
      trace: {
        shader: '/shaders/default.wgsl',
        fragmentMain: 'trace_filter',
      },
      filter: {
        shader: '/shaders/default.wgsl',
        fragmentMain: 'dog_filter',
        params: {
          range: 8,
          sd: 2,
          mag: 10,
        },
      },
    },
  };
};