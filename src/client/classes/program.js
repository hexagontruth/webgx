import { importObject, merge } from '../util';

import Pipeline from './pipeline';

const PROGRAM_PATH = '/data/programs/';

export default class Program {
  static programDefaults = {
    settings: {
      dim: 1024,
      exportDim: null,
      interval: 30,
      start: 0,
      stop: null,
      period: 360,
      skip: 1,
    },
    features: [
      'depth-clip-control',
      'shader-f16',
    ],
  };

  static async build(name) {
    const program = new Program(name);
    await program.init();
    return program;
  }

  constructor(name) {
    this.name = name;
  }

  async init() {
    merge(
      this,
      Program.programDefaults,
      await importObject(`${PROGRAM_PATH}${this.name}.js`),
    );
    
    const { settings } = this;
    console.log(Program.programDefaults);

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }

    settings.exportDim = settings.exportDim ?? settings.dim;

    this.frameCond = (counter) => {
      const { settings } = this;
      const skipCond = counter % settings.skip == 0;
      const startCond = counter >= settings.start;
      const stopCond = settings.stop == null || this.counter < settings.stop;
      return skipCond && startCond && stopCond;
    }

    this.adapter = await navigator.gpu.requestAdapter();
    this.features = this.features.filter((e) => this.adapter.features.has(e));
    this.device = await this.adapter.requestDevice({
      requiredFeatures: this.features,
    });

    this.streamTexture = this.device.createTexture({
      size: [settings.dim, settings.dim],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.pipelines = await Promise.all(Object.entries(this.pipelines).map(([name, data]) => {
      return Pipeline.build(this, name, data);
    }));
  }
}