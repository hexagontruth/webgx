import * as dat from 'dat.gui';

import {
  arrayWrap, createElement, dirName, getText, importObject,
  indexMap, join, merge, rebaseJoin,
} from '../util';

import ComputePipeline from './compute-pipeline';
import DataBuffer from './data-buffer';
import Dim from './dim';
import Encoder from './encoder';
import Hook from './hook';
import IndexBuffer from './index-buffer';
import RenderPipeline from './render-pipeline';
import TexBox from './tex-box';
import UniformBuffer from './uniform-buffer';
import VertexBuffer from './vertex-buffer';
import WebgxError from './webgx-error';

const DATA_PATH = '/data';

const { max, min } = Math;

export default class Program {
  static defaultFeatures = [
    'depth-clip-control',
    'shader-f16',
  ];

  static generateDefaults(p) {
    return {
      settings: {
        dim: 1024,          // Either scalar value or array of [width, height]
        exportDim: null,    // Dimension to send image frames to server-side video or image export
        swapDim: null,      // This is basically not even used anymore
        swapPairs: 0,       // Also not used but usable to write parallel fragment chains to different textures
        mediaFit: 'cover',  // cover or contain
        streamFit: 'cover', // cover or contain
        interval: 0,        // Timer interval between frames --- 0 is set to requestAnimationFrame
        period: 360,        // Number of frames in a cycle --- determines gu.period and gu.time
        start: 0,           // Where to start recording
        stop: null,         // Set to counter number to stop recording; "true" stops at period value
        playStop: false,    // Stop playing after recording stops
        autoplay: null,     // Set to false to prevent autoplay; "null" is overridable by URL params (I think?)
        output: {},         // ffmpeg args --- see server.yml; parameters can be overriden in dev console
        topology: 'triangle-strip',
        defaultNumVerts: 4,
        defaultDepthTest: false,
      },
      uniforms: {},
      media: [],
      controls: {},
      actions: {
        setup: () => null,
        draw: () => null,
        reset: () => null,
        onControlChange: () => null,
        onCursor: () => null,
      },
      pipelines: {},
    };
  };

  static async build(name, maxDim, ctx) {
    const program = new Program(name, maxDim, ctx);
    await program.init();
    return program;
  }

  DataBuffer = DataBuffer;

  constructor(name, maxDim, ctx) {
    this.name = name;
    this.ctx = ctx;
    this.maxDim = maxDim;
    this.activeStreams = new Set();
    this.streamActive = false;
    this.streamType = null;
    this.stream = null;
    this.playing = false;
    this.recording = false;
    this.status = '';
    this.hooks = new Hook(this, ['afterCounter', 'afterStep', 'afterStatus', 'onFit']);
    this.videoCapture = createElement('video', { autoplay: true });
    this.resetCounter();
  }

  async init() {
    this.programPath = join(DATA_PATH, `${this.name}.js`);
    this.programDir = dirName(this.programPath);
    const programObj = await importObject(this.programPath);

    this.adapter = await navigator.gpu.requestAdapter();
    this.requestedFeatures = programObj.features ?? Program.defaultFeatures;
    this.features = this.requestedFeatures.filter((e) => this.adapter.features.has(e));
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

    const def = merge({},
      Program.generateDefaults(this),
      programObj.default(this)
    );

    this.buildControls(def.controls);

    this.settings = def.settings;
    this.actions = def.actions;
    this.pipelines = def.pipelines;
    this.mediaCount = def.media.length;

    const { settings } = def;

    let dim = settings.dim;
    dim = arrayWrap(dim);
    dim.length == 1 && dim.push(dim[0]);
    const maxVal = max(...dim);

    if (this.maxDim && maxVal > this.maxDim) {
      dim = dim.map((e) => e / maxVal * this.maxDim);
    }

    settings.dim = new Dim(dim);
    if (settings.exportDim) {
      settings.exportDim = new Dim(settings.exportDim);
      const exportWidth = settings.exportDim.width;
      settings.output.width = settings.output.width ?
        min(exportWidth, settings.output.width) : exportWidth;
    }
    else {
      settings.exportDim = new Dim(dim);
    }

    if (!settings.swapPairs) {
      settings.swapDim = new Dim(1);
    }
    else if (settings.swapDim) {
      settings.swapDim = new Dim(settings.swapDim);
    }
    else {
      settings.swapDim = new Dim(dim);
    }

    settings.swapPairs = max(2, settings.swapPairs);

    const [w, h] = settings.dim;
    settings.cover = w > h ? [1, h / w] : [w / h, 1];

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }

    this.programUniforms = new UniformBuffer(this.device, def.uniforms);
    this.programUniforms.write();

    this.globalUniforms = new UniformBuffer(this.device, {
      time: 0,
      totalTime: 0,
      counter: 0,
      clock: 0,
      lastClock: 0,
      index: 0,
      period: settings.period,
      streamActive: 0,
      cover: settings.cover,
      dim: settings.dim,
    });

    this.cursorUniforms = new UniformBuffer(this.device, {
      pos: [0, 0],
      lastPos: [0, 0],
      vel: [0, 0],
      acc: [0, 0],
      leftDownPos: [0, 0],
      leftUpPos: [0, 0],
      leftDelta: [0, 0],
      leftDeltaLast: [0, 0],
      rightDownPos: [0, 0],
      rightUpPos: [0, 0],
      rightDelta: [0, 0],
      rightDeltaLast: [0, 0],
      arrowDelta: [0, 0],
      scrollDelta: 0,
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

    this.depthTexture = this.device.createTexture({
      size: settings.dim,
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.drawTexture = this.device.createTexture({
      size: settings.dim,
      format: 'bgra8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
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

    this.swapTextures = indexMap(2).map(() => {
      return this.device.createTexture({
        size: [...settings.swapDim, settings.swapPairs],
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

    this.customGroupLayout = this.createBindGroupLayout(
      ['buffer', 'buffer'],
    );

    this.swapGroupLayout = this.createBindGroupLayout(
      [
        'buffer',
        'buffer',
        'sampler',
        'sampler',
        'sampler',
        'texture',
        'texture',
        'texture',
        { texture: {viewDimension: '2d-array' } },
        { texture: {viewDimension: '2d-array' } },
      ],
    );

    this.swapGroups = indexMap(2).map((idx) => {
      return this.createBindGroup(this.swapGroupLayout, [
        { buffer: this.globalUniforms.buffer },
        { buffer: this.cursorUniforms.buffer },
        this.samplers.linear,
        this.samplers.mirror,
        this.samplers.repeat,
        this.lastTexture.createView(),
        this.inputTexture.createView(),
        this.streamTexture.createView(),
        this.mediaTexture.createView(),
        this.swapTextures[idx].createView(),
      ]);
    });

   await Promise.all(Object.values(this.pipelines).map((e) => e.init()));
  };

  buildControls(controls) {
    // This seems awkward
    this.controlDefs = {};
    this.controlData = {};
    this.hasControls = Object.keys(controls).length > 0;

    if (!this.hasControls) return;

    const buildControlData = (obj, defs, data) => {
      Object.entries(obj).map(([key, val]) => {
        if (val.constructor === Object) {
          defs[key] = {};
          data[key] = {};
          buildControlData(val, defs[key], data[key]);
        }
        else {
          defs[key] = arrayWrap(val);
          data[key] = defs[key][0];
        }
      });
    }

    const addControllers = (data, defs, controlGroup, controllers) => {
      Object.entries(data).forEach(([key, val]) => {
        const def = defs[key];
        let controller;
        if (val.constructor === Object) {
          const childGroup = controlGroup.addFolder(key);
          // childGroup.open();
          controllers[key] = {};
          addControllers(val, def, childGroup, controllers[key]);
          return;
        }
        if (typeof val == 'string') {
          controller = controlGroup.addColor(data, key);
        }
        else {
          controller = controlGroup.add(data, key, ...def.slice(1));
        }
        controllers[key] = controller;
        this.controllerList.push(controller);
        controller.onChange((e) => this.run('onControlChange', key, e));
      });
    };

    const addControls = () => {
      if (this.controls) {
        this.controls.domElement.remove();
        this.controls.destroy(); // This doesn't seem to do anything?
      }
      this.controls = new dat.GUI({ name: 'main', autoPlace: false });
      this.controllers = {};
      this.controllerList = [];
      addControllers(
        this.controlData,
        this.controlDefs,
        this.controls,
        this.controllers,
      );
    }

    buildControlData(controls, this.controlDefs, this.controlData);
    addControls();
  }

  startCond(counter) {
    const { settings } = this;
    const startCond = counter >= settings.start;
    return startCond;
  }

  stopCond(counter) {
    const { settings } = this;
    return settings.stop && counter >= settings.stop;
  }

  async loadShader(basePath, path, params) {
    params = merge({}, params, this.settings.params);
    const rows = await this.loadShaderRows(basePath, path, params);
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
          const [key, ...value] = match[2].split(/\s+/);
          params[key] = paramValues[key] ?? value.join(' ');
        }
      }
      else {
        if (row.search('$') != -1) {
          Object.entries(params).forEach(([key, value]) => {
            row = row.replaceAll(`$${key}`, value);
          });
        }
        rows.push(row);
      }
    }
    return rows;
  }

  updateGlobalUniforms() {
    const period = this.globalUniforms.get('period');
    const clock = this.globalUniforms.get('clock');
    this.globalUniforms.set('time', (this.counter / period) % 1);
    this.globalUniforms.set('totalTime', this.counter / period);
    this.globalUniforms.set('counter', this.counter);
    // This is independent of counter increment
    this.globalUniforms.set('lastClock', clock);
    this.globalUniforms.set('clock', (Date.now() - this.clockStart) / 1000);
    this.globalUniforms.write();
  }

  async updateStreams() {
    await Promise.all(Array.from(this.activeStreams).map((e) => e.update()));
  }

  async run(action='draw', ...args) {
    await this.actions[action]?.(...args);
  }

  async step(step=true) {
    step && this.stepCounter();
    this.updateGlobalUniforms();
    await this.updateStreams();
    await this.run();
    this.hooks.call('afterStep', this.counter);
  }

  getPipeline(pipelineName) {
    const pipeline = this.pipelines[pipelineName];
    if (pipeline) {
      return pipeline;
    }
    else {
      throw new WebgxError(`Pipeline ${pipelineName} not defined`);
    }
  }

  createCommandEncoder() {
    return this.device.createCommandEncoder();
  }

  submitCommandEncoder(...encoders) {
    this.device.queue.submit(encoders.map((e) => e.finish()));
  }

  stepCounter(n) {
    n = n ?? this.counter + 1;
    this.counter = n;
    this.cur = (this.counter + 2) % 2;
    this.next = (this.counter + 1) % 2;
    this.hooks.call('afterCounter', this.counter, this.cur, this.next);
  }

  setStatus(status) {
    this.status = status ?? '';
    this.hooks.call('afterStatus', this.status);
  }

  resetCounter() {
    this.stepCounter(-1);
    this.clockStart = Date.now();
  }

  resetCursorDeltas() {
    this.cursorUniforms.set('leftDelta', [0, 0]);
    this.cursorUniforms.set('rightDelta', [0, 0]);
    this.cursorUniforms.set('leftDeltaLast', [0, 0]);
    this.cursorUniforms.set('rightDeltaLast', [0, 0]);
    this.cursorUniforms.set('arrowDelta', [0, 0]);
    this.cursorUniforms.set('scrollDelta', 0);
    this.cursorUniforms.write();
  }

  resetControls() {
    this.controllerList?.forEach((controller) => {
      controller.setValue(controller.initialValue);
    });
  }

  reset() {
    this.resetCounter();
    this.resetCursorDeltas();
    this.run('reset');
    this.refresh(true);
  }

  refresh(step=false) {
    this.playing || this.step(step);
  }

  getCursorUniforms() {
    return this.cursorUniforms.getAll();
  }

  getCursorUniform(key) {
    return this.cursorUniforms.get(key);
  }

  setCursorUniforms(vals) {
    this.cursorUniforms.set(vals);
    this.cursorUniforms.write();
  }

  setCursorUniform(key, val) {
    this.cursorUniforms.set(key, val);
    this.cursorUniforms.write(key)
  }

  createBindGroupLayout(entries, flags) {
    flags = flags ?? GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
    return this.device.createBindGroupLayout({
      entries: entries.map((val, idx) => {
        const entry = {
          binding: idx,
          visibility: flags,
        };
        if (typeof val == 'string') {
          entry[val] = {};
        }
        else {
          Object.assign(entry, val);
        }
        return entry;
      }),
    });
  }

  createBindGroup(layout, entries) {
    return this.device.createBindGroup({
      layout,
      entries: entries.map((resource, binding) => {
        if (resource instanceof DataBuffer) {
          resource = { buffer: resource.buffer };
        }
        return { binding, resource };
      }),
    });
  }

  createDataBuffer(...args) {
    return new DataBuffer(this.device, ...args);
  }

  createIndexBuffer(...args) {
    return new IndexBuffer(this.device, ...args);
  }

  createVertexBuffer(...args) {
    return new VertexBuffer(this.device, ...args);
  }

  createEncoder() {
    return new Encoder(this);
  }

  submitEncoders(encoders) {
    this.device.queue.submit(encoders.map((e) => e.finish()));
  }

  async withEncoder(fn) {
    const encoder = this.createEncoder();
    await fn(encoder);
    encoder.submit();
  }

  async renderWithEncoder(fn) {
    const encoder = this.createEncoder();
    await fn(encoder);
    encoder.render();
    encoder.submit();
  }

  createComputePipeline(shaderPath, settings) {
    return new ComputePipeline(this, shaderPath, settings);
  }

  createRenderPipeline(shaderPath, settings) {
    return new RenderPipeline(this, shaderPath, settings);
  }

  clearSwapTextures() {
    this.swapTextures.forEach((swapTexture) => {
      this.clearTexture(swapTexture);
    });
  }

  clearTexture(texture) {
    const { width, height, depthOrArrayLayers } = texture;
    this.device.queue.writeTexture(
      { texture },
      new Uint8Array(width * height * depthOrArrayLayers * 4),
      { bytesPerRow: 4 * width, rowsPerImage: height},
      { width, height, depthOrArrayLayers },
    );
  }

  setMediaFit(fit) {
    this.settings.mediaFit = fit;
    this.media.forEach((e) => {
      e.setFitBox(fit);
      e.clearTexture();
      e.update();
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
        this.globalUniforms.write('streamActive', 1);
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
      this.globalUniforms.write('streamActive', 0);
    }
  }
}
