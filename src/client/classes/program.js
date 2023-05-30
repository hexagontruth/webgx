import { getText, importObject, indexMap, join, merge } from '../util';

import Pipeline from './pipeline';
import VertexData from './vertex-data';

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
      texturePairs: 1,
    },
    features: [
      'depth-clip-control',
      'shader-f16',
    ],
    actions: {
      main: () => null,
    },
    generatePipelineDefs: () => ({}),
  };

  static async build(name, ctx) {
    const program = new Program(name, ctx);
    await program.init();
    return program;
  }

  constructor(name, ctx) {
    this.name = name;
    this.ctx = ctx;
    this.shaderTextRequests = {};
    this.shaderTexts = {};
    this.resetCounter();
  }

  async init() {
    merge(
      this,
      Program.programDefaults,
      await importObject(`${PROGRAM_PATH}${this.name}.js`),
    );
    
    const { settings } = this;

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }

    settings.exportDim = settings.exportDim ?? settings.dim;

    this.adapter = await navigator.gpu.requestAdapter();
    this.features = this.features.filter((e) => this.adapter.features.has(e));
    this.device = await this.adapter.requestDevice({
      requiredFeatures: this.features,
    });
    this.ctx.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.samplers ={
      linear: this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
      }),
      mirror: this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'mirror-repeat',
        addressModeV: 'mirror-repeat',
        addressModeW: 'mirror-repeat',
      }),
      repeat: this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        addressModeW: 'repeat',
      }),
    };

    this.streamTexture = this.device.createTexture({
      size: [settings.dim, settings.dim],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.alternatingTextures = indexMap(2).map(() => {
      return indexMap(settings.texturePairs).map(() => {
        return this.device.createTexture({
          size: [settings.dim, settings.dim],
          format: 'bgra8unorm',
          usage:
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
      });
    });

    this.alternatingGroupLayout = this.device.createBindGroupLayout({
      entries: indexMap(settings.texturePairs).map((idx) => {
        return {
          binding: idx,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            // viewDimension: '2d-array',
          },
        };
      }),
    });
    this.alternatingGroup = indexMap(2).map((altIdx) => {
      return this.device.createBindGroup({
        layout: this.alternatingGroupLayout,
        entries: indexMap(settings.texturePairs).map((idx) => {
          return {
            binding: idx,
            resource: this.alternatingTextures[altIdx][idx].createView(),
          };
        }),
      });
    });

    const pipelineDefs = this.generatePipelineDefs(this);
    this.pipelines = await Pipeline.buildAll(this, pipelineDefs);
  }

  frameCond(counter) {
    const { settings } = this;
    const skipCond = counter % settings.skip == 0;
    const startCond = counter >= settings.start;
    const stopCond = settings.stop == null || counter < settings.stop;
    return skipCond && startCond && stopCond;
  }

  async loadShader(path) {
    const dir = path.substring(0, path.lastIndexOf('/'));
    const text = await getText(path);
    const rows = text.split('\n');
    const chunks = [];
    let chunkStart = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const match = row.match(/^\#include ([\w-\/\.]+)(\.wgsl)?$/);
      if (match) {
        if (i > chunkStart)
          chunks.push(rows.slice(chunkStart, i));
        const includePath = join(dir, match[1] + '.wgsl');
        let includeText = await this.loadShader(includePath);
        chunks.push(includeText.split('\n'));
        chunkStart = i + 1;
      }
    }
    chunks.push(rows.slice(chunkStart));
    return chunks.map((e) => e.join('\n')).join('\n');
  }

  buildVertexData(data) {
    return new VertexData(this, data);
  }

  resetCounter() {
    this.stepCounter(-1);
  }

  stepCounter(n) {
    n = n ?? this.counter + 1;
    this.counter = n;
    this.cur = (this.counter + 2) % 2;
    this.next = (this.counter + 1) % 2;
  }

  async run(action='main') {
    await this.actions[action](this);
  }

  render(pipelineName, counter=this.counter) {
    this.pipelines[pipelineName].render(counter);
  }

  draw() {
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyTextureToTexture(
      {
        texture: this.alternatingTextures[this.next][0],
      },
      {
        texture: this.ctx.getCurrentTexture(),
      },
      {
        width: this.settings.dim,
        height: this.settings.dim,
      },
    );
    this.device.queue.submit([commandEncoder.finish()]);
  }
}