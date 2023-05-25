import { createElement, getText, importObject, merge, postJson } from '../util';

export default class Player {
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
  };

  constructor(app, container) {
    this.app = app;
    this.config = app.config;
    this.container = container;

    this.play = this.config.autoplay;
    this.recording = false;
    this.videoCapturing = false;
    this.counter = -1;

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');
    this.exportCanvas = createElement('canvas');
    this.exportCtx = this.exportCanvas.getContext('2d');

    this.videoCapture = createElement(
      'video',
      {
        loop: true,
        autoplay: true,
        muted: true,
      },
    )

    this.canvas.addEventListener('pointerdown', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => app.handlePointer(ev));

    this.init().then(() => this.render());
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
    this.ctx.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    this.program = merge(
      {},
      Player.programDefaults,
      await importObject(`/data/programs/${this.config.program}.js`),
    );
    const { settings } = this.program;

    if (settings.stop == true) {
      settings.stop = settings.start + settings.period;
    }

    settings.exportDim = settings.exportDim ?? settings.dim;

    this.frameCond = () => {
      const skipCond = this.counter % settings.skip == 0;
      const startCond = this.counter >= settings.start;
      const stopCond = settings.stop == null || this.counter < settings.stop;
      return skipCond && startCond && stopCond;
    }

    this.canvas.width = this.canvas.height = settings.dim;
    this.exportCanvas.width = this.exportCanvas.height = settings.exportDim;

    this.defaultTexture = this.device.createTexture({
      size: [this.program.settings.dim, this.program.settings.dim],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    await Promise.all(Object.entries(this.program.pipelines).map(async ([name, pipeline]) => {
      const shaderText = await getText(pipeline.shader);
      pipeline.shaderText = shaderText;
      pipeline.shaderModule = this.device.createShaderModule({
        code: shaderText,
      });
      pipeline.vertexBuffer = this.device.createBuffer({
        size: pipeline.vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      pipeline.uniformBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      pipeline.uniformData = new Float32Array([
        0, 1, 1, 1,
        1, 0.5,
        0, 0,
      ]);
      this.device.queue.writeBuffer(
        pipeline.vertexBuffer, 0,
        pipeline.vertexData, 0,
        pipeline.vertexData.length
      );
      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {},
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {},
          },
        ],
      });
      const pipelineDescriptor = {
        vertex: {
          module: pipeline.shaderModule,
          entryPoint: 'vertex_main',
          buffers: pipeline.vertexBuffers,
        },
        fragment: {
          module: pipeline.shaderModule,
          entryPoint: 'fragment_main',
          targets: [
            {
              format: navigator.gpu.getPreferredCanvasFormat(),
            },
          ],
        },
        primitive: {
          topology: 'triangle-strip',
        },
        layout: this.device.createPipelineLayout({
            bindGroupLayouts: [
              bindGroupLayout,
            ],
        }),
      };
      pipeline.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);
      pipeline.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
      });
      pipeline.bindGroup = this.device.createBindGroup({
        layout: pipeline.renderPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: pipeline.uniformBuffer }
          },
          {
            binding: 1,
            resource: this.defaultTexture.createView(),
          },
          {
            binding: 2,
            resource: pipeline.sampler,
          },
        ],
      });
    }));
  }

  setTimer(cond) {
    const { settings } = this.program;
    requestAnimationFrame(() => {
      let interval = settings.interval;
      if (this.recording && cond) {
        interval = Math.max(settings.interval, settings.recordingInterval || 0);
      }
      this.intervalTimer = setTimeout(() => this.render(), interval);
    });
  }

  async render(...pipelines) {
    this.counter ++;
    pipelines = pipelines.length ? pipelines : Object.keys(this.program.pipelines);
    await Promise.all(pipelines.map(async (pipelineName) => {
      const pipeline = this.program.pipelines[pipelineName];
      const commandEncoder = this.device.createCommandEncoder();
      const clearColor = { r: 0.2, g: 0.5, b: 1.0, a: 1.0 };
      const renderPassDescriptor = {
        colorAttachments: [
          {
            clearValue: clearColor,
            loadOp: 'clear',
            storeOp: 'store',
            view: this.ctx.getCurrentTexture().createView(),
          },
        ],
      };

      pipeline.uniformData[0] = this.counter / 12;
      this.device.queue.writeBuffer(pipeline.uniformBuffer, 0, pipeline.uniformData);
      if (this.videoCapturing) {
        const t1 = Date.now();
        const bitmap = await createImageBitmap(this.videoCapture);
        this.device.queue.copyExternalImageToTexture(
          {
            source: bitmap,
          },
          {
            texture: this.defaultTexture,
          },
          [Math.min(bitmap.width, 1024), Math.min(bitmap.height, 1024)],
        );
      }
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline.renderPipeline);
      passEncoder.setVertexBuffer(0, pipeline.vertexBuffer);
      passEncoder.setBindGroup(0, pipeline.bindGroup);
      passEncoder.draw(4);
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
    }));

    requestAnimationFrame(() => this.endFrame(), 0);
  }

  endFrame() {
    const frameIdx = this.counter;
    const cond = this.frameCond();
    if (this.recording && cond) {
      this.getDataUrl()
      .then((data) => this.postFrame(data, frameIdx));
    }
    this.app.set('counter', this.counter);
    this.play && this.setTimer(cond);
  }

  async getDataUrl() {
    const dim = this.program.settings.exportDim ?? this.program.settings.dim;
    this.exportCtx.drawImage(this.canvas, 0, 0, dim, dim);
    return await this.exportCanvas.toDataURL('image/png', 1);
  }

  async postFrame(dataUrl, frameIdx) {
    try {
      await fetch(`/api/frame/${frameIdx}`, {
        method: 'POST',
        headers: {'Content-Type': `text/plain`},
        body: dataUrl
      });
    }
    catch (err) {
      console.error(err);
    }
  }

  resetCounter() {
    this.counter = -1;
  }

  togglePlay(val=!this.play) {
    this.play = val;
    val && this.render();
    return val;
  }

  toggleRecord(val=!this.recording) {
    this.recording = val;
    val && this.resetCounter();
  }

  setStream(stream) {
    const oldStream = this.stream;
    this.stream = stream;
    if (stream) {
      this.videoCapture.onloadeddata = () => {
        this.videoCapturing = true;
      }
      this.videoCapture.srcObject = this.stream;

      let args = {
        dim: this.program.settings.dim,
        img: this.videoCapture,
        fit: this.app.config.streamFit
      };

    }
    // Remove stream
    else {
      this.videoCapturing = false;
    }
  }
}