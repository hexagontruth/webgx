import { createElement } from '../util';
import Dim from './dim';
import FitBox from './fit-box';
import MediaTexture from './media-texture';
import Program from './program';

const { max, min } = Math;

export default class Player {
  constructor(app, container) {
    this.app = app;
    this.config = app.config;
    this.container = container;

    this.play = this.config.autoplay;
    this.recording = false;
    this.streamActive = false;
    this.streamType = null;
    this.stream = null;

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');
    this.exportCanvas = createElement('canvas');
    this.exportCtx = this.exportCanvas.getContext('2d');

    this.videoCapture = createElement('video', { autoplay: true });
    this.setStreamFit();
  
    this.config.testSet.add('screenShareEnabled', (v) => this.setStreamEnabled(v, 'screenShare'));
    this.config.testSet.add('webcamEnabled', (v) => this.setStreamEnabled(v, 'webcam'));

    this.canvas.addEventListener('pointerdown', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => app.handlePointer(ev));

    // this.init().then(() => this.render());
  }

  async init() {
    this.program = await Program.build(this.config.program, this.ctx);
    this.device = this.program.device;
    this.settings = this.program.settings;
    const { settings } = this.program;

    this.canvas.width = this.canvas.height = settings.dim[0];
    this.exportCanvas.width = settings.exportDim.width;
    this.exportCanvas.height = settings.exportDim.height;
  }

  setTimer(cond) {
    const { settings } = this.program;
    requestAnimationFrame(() => {
      let interval = settings.interval;
      if (this.recording && cond) {
        interval = max(settings.interval, settings.recordingInterval || 0);
      }
      this.intervalTimer = setTimeout(() => this.draw(), interval);
    });
  }

  async draw() {
    await this.updateStream();
    this.program.stepCounter();
    await this.program.run();
    requestAnimationFrame(() => this.endFrame(), 0);
  }

  endFrame() {
    const counter = this.program.counter;
    const cond = this.program.frameCond(counter);
    if (this.recording && cond) {
      this.getDataUrl()
      .then((data) => this.postFrame(data, counter));
    }
    this.app.set('counter', counter);
    this.play && this.setTimer(cond);
  }

  async getDataUrl() {
    const dim = this.program.settings.exportDim ?? this.program.settings.dim;
    this.exportCtx.drawImage(this.canvas, 0, 0, ...dim);
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

  async promptDownload() {
    let uri = await this.getDataUrl();
    let a = document.createElement('a');
    a.href = uri;
    a.download = `frame-${('0000' + this.program.counter).slice(-4)}.png`;
    a.click();
  }

  togglePlay(val=!this.play) {
    this.play = val;
    val && this.draw();
    return val;
  }

  toggleRecord(val=!this.recording) {
    this.recording = val;
    val && this.program.resetCounter();
  }

  resetCounter() {
    this.program.resetCounter();
    this.program.run('reset');
    this.play || this.draw();
  }

  setFit() {

  }

  setStreamFit() {

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
    const oldStream = this.stream;
    this.stream = stream;
    if (stream) {
      this.streamType = type;
      this.videoCapture.onloadeddata = () => {
        this.streamActive = true;
        this.setStreamFit();
      }
      this.videoCapture.srcObject = this.stream;
    }
    // Remove stream
    else if (this.streamType == type) {
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

  setStreamFit() {
    const dim = new Dim(this.program?.settings.dim);
    this.device?.queue.writeTexture(
      {
        texture: this.program.streamTexture,
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
    return this.streamFitBox = new FitBox(
      ...new Dim(this.program?.settings.dim),
      ...new Dim(this.videoCapture),
      this.config.streamFit,
    );
  }

  async updateStream() {
    return;
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
          texture: this.program.streamTexture,
          origin: textureOrigin,
        },
        [bitmap.width, bitmap.height],
      );
    }
  }
}