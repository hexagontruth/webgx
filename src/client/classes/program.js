import {
  createElement, getText, importObject, indexMap, join, merge
} from '../util';

import Dim from './dim';
import FitBox from './fit-box';
import Hook from './hook';
import MediaTexture from './media-texture';
import Pipeline from './pipeline';
import VertexData from './vertex-data';

const PROGRAM_PATH = '/data/programs/';

const { max, min } = Math;

export default class Program {
  static programDefaults = {
    settings: {
      dim: 1024,
      exportDim: null,
      mediaDim: null,
      interval: 30,
      start: 0,
      stop: null,
      period: 360,
      skip: 1,
      mediaFit: 'cover',
      streamFit: 'cover',
      texturePairs: 3,
      output: {},
      media: [],
      params: {},
    },
    features: [
      'depth-clip-control',
      'shader-f16',
    ],
    actions: {
      draw: () => null,
      reset: () => null,
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
    this.activeStreams = [];
    this.mediaFitBox = null;
    this.streamFitBox = null;
    this.streamActive = false;
    this.streamType = null;
    this.stream = null;
    this.hooks = new Hook(this, ['afterCounter', 'onFit']);
    this.videoCapture = createElement('video', { autoplay: true });
    this.resetCounter();
  }

  async init() {
    merge(
      this,
      Program.programDefaults,
      await importObject(`${PROGRAM_PATH}${this.name}.js`),
    );
    
    const { settings } = this;

    settings.dim = new Dim(settings.dim);
    settings.exportDim = new Dim(settings.exportDim ?? settings.dim);
    settings.mediaDim = new Dim(settings.mediaDim ?? settings.dim);

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }
  
    this.mediaCount = this.settings.media.length;

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
      size: settings.dim,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    this.drawTexture = this.device.createTexture({
      size: settings.dim,
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    this.lastTexture = this.device.createTexture({
      size: settings.dim,
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    this.inputTexture = this.device.createTexture({
      size: settings.dim,
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    this.renderTextures = indexMap(2).map(() => {
      return this.device.createTexture({
        size: [...settings.dim, settings.texturePairs],
        format: 'bgra8unorm',
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
    });

    this.arrayGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            viewDimension: '2d-array',
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    });

    this.arrayGroup = indexMap(2).map((idx) => {
      return this.device.createBindGroup({
        layout: this.arrayGroupLayout,
        entries: [
          {
            binding: 0,
            resource: this.renderTextures[idx].createView(),
          },
          {
             binding: 1,
             resource: this.lastTexture.createView(),
          },
          {
            binding: 2,
            resource: this.inputTexture.createView(),
          }
        ],
      });
    });

    this.mediaTexture = this.device.createTexture({
      size:
        this.mediaCount > 1 ? [...settings.dim, this.mediaCount] :
        this.mediaCount > 0 ? [...settings.dim, 2] :
        [1, 1, 2],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.mediaTextures = await Promise.all(settings.media.map(async (filename, idx) => {
      const ext = filename.match(/\.(\w+)$/)?.[1];
      const isImage = ['jpg', 'jpeg', 'gif', 'png', 'webp'].includes(ext);
      let el = isImage ? new Image() : createElement('video');
      const mediaTexture = MediaTexture.awaitLoad(
          this.device,
          this.mediaTexture,
          el,
          this.mediaFit,
          idx,
        );
      el.src = join('/data/media', filename);
      return mediaTexture;
    }));

    this.mediaTextures.forEach((mediaTexture) => {
      if (mediaTexture.isVideo) {
        this.activeStreams.push(mediaTexture);
      }
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

  async loadShader(path, params) {
    params = merge({}, params, this.settings.params);
    const rows = await this.loadShaderRows(path, params);
    return rows.join('\n');
  }

  async loadShaderRows(path, paramValues) {
    // TODO: Make this actually async maybe idk
    const dir = path.substring(0, path.lastIndexOf('/'));
    const text = await getText(path);
    const sourceRows = text.split('\n');
    const params = {};
    let rows = [];
    while (sourceRows.length) {
      let row = sourceRows.shift();
      const match = row.match(/^\#(\w+)\s+(.*?)\s*$/);
      if (match) {
        const directive = match[1];
        const args = match[2].split(/\s+/);
        if (directive == 'include') {
          const includePath = join(dir, args[0] + '.wgsl');
          let includeRows = await this.loadShaderRows(includePath);
          rows = rows.concat(includeRows);
        }
        else if (directive == 'param') {
          const [key, value] = match[2].split(/\s+/);
          params[key] = paramValues[key] ?? value;
        }
      }
      else {
        Object.entries(params).forEach(([key, value]) => {
          row = row.replaceAll(`$${key}`, value);
        });
        rows.push(row);
      }
    }
    return rows;
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
    this.hooks.call('afterCounter', this.counter, this.cur, this.next);
  }

  async run(action='draw') {
    await Promise.all(this.activeStreams.map((e) => e.update()));
    await this.actions[action](this);
  }

  render(pipelineName, txIdx) {
    this.pipelines[pipelineName].render(txIdx);
  }

  draw(txIdx) {
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyTextureToTexture(
      txIdx != null ? {
        // texture: this.alternatingTextures[this.next][0],
        texture: this.renderTextures[this.next],
        origin: { x: 0, y: 0, z: txIdx },
      } : {
        texture: this.drawTexture,
      },
      {
        texture: this.ctx.getCurrentTexture(),
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
    this.device.queue.submit([commandEncoder.finish()]);
  }

  setMediaFit(fit) {
    this.settings.mediaFit = fit;
    this.mediaTextures.forEach((e) => {
      e.setFitBox(fit);
      e.clearTexture();
    });
  }

  setStreamFit(fit=this.settings.streamFit) {
    this.settings.streamFit = fit;
    const dim = this.settings.mediaDim;
    this.device.queue.writeTexture(
      {
        texture: this.streamTexture,
      },
      new Float32Array(dim.area * 4),
      {
        bytesPerRow: 4 * 4 * dim.width,
      },
      {
        width: dim.width,
        height: dim.height,
      },
    );
    this.streamFitBox = new FitBox(
      ...new Dim(this.settings.dim),
      ...new Dim(this.videoCapture),
      fit,
    );
  }

  async setStreamEnabled(val, type) {
    try {
      let stream;
      if (val) {
        stream = await (
          type == 'screenShare' ?
          navigator.mediaDevices.getDisplayMedia() :
          navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 4096 } },
            audio: false,
          })
        );
      }
      this.setStream(stream, type);
      return true;
    }
    catch(err) {
      console.error(err);
      return false;
    }
  }

  setStream(stream, type) {
    if (stream) {
      this.stream = stream;
      this.streamType = type;
      this.videoCapture.onloadeddata = () => {
        this.streamActive = true;
        this.setStreamFit();
      }
      this.videoCapture.srcObject = this.stream;
    }
    // Remove stream
    else if (this.streamType == type) {
      const oldStream = this.stream;
      oldStream && oldStream.getTracks().forEach((track) => {
        track.readyState == 'live' && track.stop();
      });
      this.stream = null;
      this.streamActive = false;
      this.streamType = null;
      this.videoCapture.srcObject = null;
      this.setStreamFit();
    }
  }

  async updateStream() {
    if (this.streamActive) {
      const { child, childCrop, childScale } = this.streamFitBox;
      const bitmap = await createImageBitmap(
        this.videoCapture,
        ...childCrop,
        {
          resizeWidth: childScale.width,
          resizeHeight: childScale.height,
        },
      );
      const textureOrigin = [
        max(child.x, 0),
        max(child.y, 0),
      ];
      this.device.queue.copyExternalImageToTexture(
        {
          source: bitmap,
          // flipY: true,
        },
        {
          texture: this.streamTexture,
          origin: textureOrigin,
        },
        [bitmap.width, bitmap.height],
      );
    }
  }
}