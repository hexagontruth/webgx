export default (p) => {
  const shader = 'default.wgsl';
  return {
    settings: {
      dim: 4096,
      // dim: [1080, 1920],
      // dim: [1920, 1080],
      period: 120,
      start: 0,
      stop: true,
      renderPairs: 3,
      output: {
        fps: 15,
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
      scale: [4, 3, 12, 1],
      cover: true, // Only has effect for non-square aspect ratio,
      filter: {
        sd: [2, 1, 8, 0.1],
        range: [6, 0, 16, 1],
        magnitude: [8, 0, 64, 0.1],
        filterScale: [1.1, 0, 2, 0.01],
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
      scale: 4,
      cover: 1,
      sd: 2,
      range: 8,
      magnitude: 8,
      filterScale: 1.1,
      rows: 6,
      cols: 12,
      cycleX: 0,
      cycleY: 1,
    },
    media: [],
    actions: {
      draw: async () => {
        p.draw('logo', 0);
        p.draw('trace', 1);
        p.draw('filter', 2);
        p.render();
      },
      onControlChange: (key, val) => {
        const uniforms = p.programUniforms.has(key) ? p.programUniforms : p.globalUniforms;
        uniforms.write(key, val);
      },
    },
    pipelines: {
      logo: p.createRenderPipeline(shader),
      trace: p.createRenderPipeline(shader, { fragmentMain: 'traceFilterMain' }),
      filter: p.createRenderPipeline(shader, { fragmentMain: 'dogFilterMain' }),
    },
  };
};
