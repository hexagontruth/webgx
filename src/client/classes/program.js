import {
  arrayWrap, createElement, dirName, getText, importObject,
  indexMap, join, merge, objectMap, rebaseJoin,
} from '../util';

import Dim from './dim';
import Hook from './hook';
import Pipeline from './pipeline';
import TexBox from './tex-box';
import UniformBuffer from './uniform-buffer';
import VertexBuffer from './vertex-buffer';
import VertexSet from './vertex-set';

const DATA_PATH = '/data';

const { max, min } = Math;

export default class Program {
  static generateDefaults(p) {
    return {
      settings: {
        dim: 1024,
        exportDim: null,
        mediaFit: 'cover',
        streamFit: 'cover',
        interval: 30,
        start: 0,
        stop: null,
        period: 360,
        recordingPeriod: null,
        skip: 1,
        renderPairs: 3,
        output: {},
      },
      vertexData: [
        p.createVertexSet(4, [
          -1, -1, 0, 1,
          1, -1, 0, 1,
          -1, 1, 0, 1,
          1, 1, 0, 1,
        ]),
      ],
      uniforms: {},
      media: [],
      controls: {},
      features: [
        'depth-clip-control',
        'shader-f16',
      ],
      actions: {
        setup: () => null,
        draw: () => null,
        reset: () => null,
        controlChange: () => null,
      },
      pipelines: {},
    };
  };

  static async build(name, maxDim, ctx) {
    const program = new Program(name, maxDim, ctx);
    await program.init();
    return program;
  }

  constructor(name, maxDim, ctx) {
    this.name = name;
    this.ctx = ctx;
    this.maxDim = maxDim;
    this.shaderTextRequests = {};
    this.shaderTexts = {};
    this.activeStreams = new Set();
    this.streamActive = false;
    this.streamType = null;
    this.stream = null;
    this.recording = false;
    this.hooks = new Hook(this, ['afterCounter', 'onFit']);
    this.videoCapture = createElement('video', { autoplay: true });
    this.resetCounter();
  }

  async init() {
    this.programPath = join(DATA_PATH, `${this.name}.js`);
    this.programDir = dirName(this.programPath);
    const defFn = await importObject(this.programPath);
    const def = merge({}, Program.generateDefaults(this), defFn(this));
    this.settings = def.settings;
    this.vertexData = def.vertexData;
    this.actions = def.actions;
    const { settings } = def;

    let dim = settings.dim;
    dim = arrayWrap(dim);
    dim.length == 1 && dim.push(dim[0]);
    const maxVal = max(...dim);
    if (this.maxDim && maxVal > this.maxDim) {
      dim = dim.map((e) => e / maxVal * this.maxDim);
    }

    settings.dim = new Dim(dim);
    settings.exportDim = new Dim(settings.exportDim ?? dim);
    const [w, h] = settings.dim;
    settings.cover = w > h ? [1, h / w] : [w / h, 1];
    settings.recordingPeriod = settings.recordingPeriod ?? settings.period;

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }
  
    this.hasControls = Object.keys(def.controls).length > 0;
    this.controlDefs = objectMap(def.controls, ([k, v]) => [k, arrayWrap(v)]);
    this.controlData = objectMap(this.controlDefs, ([k, v]) => [k, v[0]]);

    this.mediaCount = def.media.length;

    this.adapter = await navigator.gpu.requestAdapter();
    this.features = def.features.filter((e) => this.adapter.features.has(e));
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

    this.vertexBuffers = this.vertexData.map((vertexSet) => {
      return new VertexBuffer(this.device, vertexSet);
    });

    this.programUniforms = new UniformBuffer(this.device, def.uniforms);
    this.programUniforms.update();

    this.globalUniforms = new UniformBuffer(this.device, {
      time: 0,
      counter: 0,
      clock: 0,
      lastClock: 0,
      index: 0,
      period: settings.period,
      cover: settings.cover,
      dim: settings.dim,
    });

    this.cursorUniforms = new UniformBuffer(this.device, {
      pos: [0, 0],
      lastPos: [0, 0],
      vel: [0, 0],
      acc: [0, 0],
      leftDown: 0,
      leftDownAt: 0,
      leftUpAt: 0,
      rightDown: 0,
      rightDownAt: 0,
      rightUpAt: 0,
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
        size: [...settings.dim, settings.renderPairs],
        format: 'bgra8unorm',
        usage:
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
    });

    this.streamTexture = this.device.createTexture({
      size: settings.dim,
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    });

    this.streamTexBox = new TexBox(
      this.device,
      this.streamTexture,
      this.videoCapture,
      this.settings.streamFit,
    );

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

    this.media = await Promise.all(def.media.map(async (filename, idx) => {
      const ext = filename.match(/\.(\w+)$/)?.[1];
      const isImage = ['jpg', 'jpeg', 'gif', 'png', 'webp'].includes(ext);
      let el = isImage ? new Image() : createElement('video');
      const mediaTexture = TexBox.awaitLoad(
          this.device,
          this.mediaTexture,
          el,
          settings.mediaFit,
          idx,
        );
      el.src = rebaseJoin(DATA_PATH, this.programDir, filename);
      return mediaTexture;
    }));

    this.media.forEach((mediaTexture) => {
      if (mediaTexture.isVideo) {
        this.activeStreams.add(mediaTexture);
      }
    });

    this.customGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    this.swapGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 6,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 7,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 8,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            viewDimension: '2d-array',
          },
        },
        {
          binding: 9,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            viewDimension: '2d-array',
          },
        },
      ],
    });

    this.swapGroups = indexMap(2).map((idx) => {
      return this.device.createBindGroup({
        layout: this.swapGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.globalUniforms.buffer },
          },
          {
            binding: 1,
            resource: { buffer: this.cursorUniforms.buffer },
          },
          {
            binding: 2,
            resource: this.samplers.linear,
          },
          {
            binding: 3,
            resource: this.samplers.mirror,
          },
          {
            binding: 4,
            resource: this.samplers.repeat,
          },
          {
             binding: 5,
             resource: this.lastTexture.createView(),
          },
          {
            binding: 6,
            resource: this.inputTexture.createView(),
          },
          {
            binding: 7,
            resource: this.streamTexture.createView(),
          },
          {
            binding: 8,
            resource: this.mediaTexture.createView(),
          },
          {
            binding: 9,
            resource: this.renderTextures[idx].createView(),
          },
        ],
      });
    });

    this.pipelines = await Pipeline.buildAll(this, def.pipelines);
  };

  frameCond(counter) {
    const { settings } = this;
    const skipCond = counter % settings.skip == 0;
    const startCond = counter >= settings.start;
    const stopCond = settings.stop == null || counter < settings.stop;
    return skipCond && startCond && stopCond;
  }

  async loadShader(path, params) {
    params = merge({}, params, this.settings.params);
    const rows = await this.loadShaderRows(DATA_PATH, path, params);
    return rows.join('\n');
  }

  // TODO: jfc this is awful
  async loadShaderRows(basePath, path, paramValues) {
    const filename = rebaseJoin(DATA_PATH, basePath, path);
    const dir = dirName(filename);
    const text = await getText(join(filename));
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
          const includePath = args[0] + '.wgsl';
          let includeRows = await this.loadShaderRows(dir, includePath);
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

  updateGlobalUniforms() {
    const period = this.recording ? this.settings.recordingPeriod : this.settings.period;
    this.globalUniforms.set('period', period);
    this.globalUniforms.set('time', (this.counter / period) % 1);
    this.globalUniforms.set('counter', this.counter);
    // This is independent of counter increment
    this.globalUniforms.set('lastClock', this.globalUniforms.get('clock'));
    this.globalUniforms.set('clock', Date.now());
    this.globalUniforms.update();
    this.cursorUniforms.update();
  }

  async updateStreams() {
    await Promise.all(Array.from(this.activeStreams).map((e) => e.update()));
  }

  async run(action='draw', ...args) {
    await this.actions[action]?.(...args);
  }

  render(pipelineName, txIdx, start, end) {
    this.pipelines[pipelineName].render(txIdx, start, end);
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

  getCursorUniforms() {
    return this.cursorUniforms.getAll();
  }

  setCursorUniforms(vals) {
    this.cursorUniforms.set(vals);
  }

  createVertexSet(...args) {
    return new VertexSet(...args);
  }

  clearRenderTextures() {
    this.renderTextures.forEach((renderTexture) => {
      const { width, height, depthOrArrayLayers } = renderTexture;
      this.device.queue.writeTexture(
        { texture: renderTexture },
        new Uint8Array(width * height * depthOrArrayLayers * 4),
        { bytesPerRow: 4 * width, rowsPerImage: height},
        { width, height, depthOrArrayLayers },
      );
    });
  }

  setMediaFit(fit) {
    this.settings.mediaFit = fit;
    this.media.forEach((e) => {
      e.setFitBox(fit);
      e.clearTexture();
    });
  }

  setStreamFit(fit=this.settings.streamFit) {
    this.settings.streamFit = fit;
    this.streamTexBox.setFitBox(fit);
    this.streamTexBox.clearTexture();
  }

  async setStreamEnabled(val, type) {
    let stream;
    try {
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
        this.streamTexBox.setFitBox();
        this.activeStreams.add(this.streamTexBox);
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
      this.activeStreams.delete(this.streamTexBox);
      this.streamTexBox.clearTexture();
    }
  }
}