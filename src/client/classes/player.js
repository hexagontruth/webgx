import { createElement } from '../util';
import Hook from './hook';
import Program from './program';

const { max, min } = Math;

export default class Player {
  static async build(app, container) {
    const player = new Player(app, container);
    await player.init();
    return player;
  }

  constructor(config, container) {
    this.config = config;
    this.container = container;

    this.play = this.config.autoplay;
    this.recording = false;

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');
    this.exportCanvas = createElement('canvas');
    this.exportCtx = this.exportCanvas.getContext('2d');

    this.hooks = new Hook(this, ['afterCounter', 'onPointer']);

    this.canvas.addEventListener('pointerdown', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => this.handlePointer(ev));

    // this.init().then(() => this.render());
  }

  async init() {
    this.program = await Program.build(this.config.program, this.ctx);
    this.device = this.program.device;

    const { program, config } = this;

    program.hooks.add('afterCounter', (...args) => this.hooks.call('afterCounter', ...args));

    config.testSet.add('screenShareEnabled', (v) => program.setStreamEnabled(v, 'screenShare'));
    config.testSet.add('webcamEnabled', (v) => program.setStreamEnabled(v, 'webcam'));
    config.afterSet.add('streamFit', (v) => program.setStreamFit(v));
    config.afterSet.add('mediaFit', (v) => program.setMediaFit(v));

    this.canvas.width = program.settings.dim.width;
    this.canvas.height = program.settings.dim.height;
    this.exportCanvas.width = program.settings.exportDim.width;
    this.exportCanvas.height = program.settings.exportDim.height;
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
    // await this.program.updateStream();
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

  handlePointer(ev) {
    // this.player.uniforms.cursorLast = this.player.uniforms.cursorPos;
    // this.player.uniforms.cursorPos = [
    //   ev.offsetX / this.styleDim * 2 - 1,
    //   ev.offsetY / this.styleDim * -2 + 1,
    // ];

    if (ev.type == 'pointerdown') {
      this.cursorDown = true;
      // this.player.uniforms.cursorLast = this.player.uniforms.cursorPos.slice();
    }
    else if (ev.type == 'pointerup' || ev.type == 'pointerout' || ev.type == 'pointercancel') {
      this.cursorDown = false;
    }

    // this.player.uniforms.cursorAngle = Math.atan2(ev.offsetY, ev.offsetX);
  }
}