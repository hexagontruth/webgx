import { createElement, getText, importObject, merge, postJson } from '../util';
import Box from './box';
import Program from './program';

const { max, min } = Math;

export default class Player {
  constructor(app, container) {
    this.app = app;
    this.config = app.config;
    this.container = container;

    this.play = this.config.autoplay;
    this.recording = false;
    this.counter = -1;
    this.streamActive = false;
    this.stream = null;

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
    );
    this.setStreamFit();

    this.canvas.addEventListener('pointerdown', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => app.handlePointer(ev));

    this.init().then(() => this.render());
  }

  async init() {
    this.program = await Program.build(this.config.program);
    this.device = this.program.device;
    this.settings = this.program.settings;
    const { settings } = this.program;

    this.ctx.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    this.canvas.width = this.canvas.height = settings.dim;
    this.exportCanvas.width = this.exportCanvas.height = settings.exportDim;
  }

  setTimer(cond) {
    const { settings } = this.program;
    requestAnimationFrame(() => {
      let interval = settings.interval;
      if (this.recording && cond) {
        interval = max(settings.interval, settings.recordingInterval || 0);
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

      pipeline.uniformData[0] = this.counter / this.program.settings.period;
      this.device.queue.writeBuffer(pipeline.uniformBuffer, 0, pipeline.uniformData);
      if (this.streamActive) {
        const { streamFitBox } = this;
        const bitmap = await createImageBitmap(
          this.videoCapture,
          max(-streamFitBox.x, 0) * this.videoCapture.videoWidth / streamFitBox.w,
          max(-streamFitBox.y, 0) * this.videoCapture.videoHeight / streamFitBox.h,
          (streamFitBox.w + min(streamFitBox.x*2, 0)) * this.videoCapture.videoWidth / streamFitBox.w,
          (streamFitBox.h + min(streamFitBox.y*2, 0)) * this.videoCapture.videoHeight / streamFitBox.h,
          {
            resizeWidth: streamFitBox.w + min(streamFitBox.x*2, 0),
            resizeHeight: streamFitBox.h + min(streamFitBox.y*2, 0),
          },
        );
        const textureOrigin = [
          max(streamFitBox.x, 0),
          max(streamFitBox.y, 0),
        ];
        this.device.queue.copyExternalImageToTexture(
          {
            source: bitmap,
            flipY: true,
          },
          {
            texture: this.program.streamTexture,
            origin: textureOrigin,
          },
          [bitmap.width, bitmap.height],
          // {
          //   width: min(bitmap.width, 1024),
          //   height: min(bitmap.height, 1024),
          // },
          // [Math.min(bitmap.width, 1024), Math.min(bitmap.height, 1024)],
        );
      }
      // pipeline.vertexData[1] = (this.counter/60) % 1 * 2 -1;
      this.device.queue.writeBuffer(
        pipeline.vertexBuffer, 0,
        pipeline.vertexData, 0,
        pipeline.vertexData.length
      );
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
    const cond = this.program.frameCond(this.counter);
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
        this.streamActive = true;
        this.setStreamFit();
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
      this.stream = null;
      this.streamActive = false;
      this.videoCapture.srcObject = null;
      this.setStreamFit();
      const dim = this.program.settings.dim;
    }
  }

  setStreamFit() {
    const dim = this.program?.settings.dim;
    this.device?.queue.writeTexture(
      {
        texture: this.program.streamTexture,
      },
      new Float32Array(dim * dim * 4),
      {
        bytesPerRow: 4 * 4 * 1024,
      },
      {
        width: dim,
        height: dim,
      },
    );
    return this.streamFitBox = Box.fitOffset(
      this.program?.settings.dim,
      this.program?.settings.dim,
      this.videoCapture?.videoWidth,
      this.videoCapture?.videoHeight,
      this.config.streamFit,
    );
  }
}