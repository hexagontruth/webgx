import { createElement, indexMap } from '../util';
import TimerBuffer from './timer-buffer';
import Hook from './hook';
import Program from './program';

const { max, min } = Math;

const REDRAW_DELAY = 50;

export default class Player {
  static async build(app, container) {
    const player = new Player(app, container);
    await player.init();
    return player;
  }

  constructor(config, container) {
    this.config = config;
    this.container = container;
    this.cursorOut = true;

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');
    this.exportCanvas = createElement('canvas');
    this.exportCtx = this.exportCanvas.getContext('2d');
    this.encoder = new TextEncoder();
    this.recordingStart = null;
    this.recordedFrames = 0;

    this.hooks = new Hook(this, [
      'afterCounter',
      'afterStatus',
      'onPointer',
      'beforePlayingStart',
      'afterPlayingStop',
      'beforeRecordingStart',
      'afterRecordingStop'
    ]);
    this.timerBuffer = new TimerBuffer();

    this.canvas.addEventListener('pointerdown', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => this.handlePointer(ev));
    this.canvas.addEventListener('wheel', (ev) => this.handleScroll(ev));
    this.canvas.addEventListener('contextmenu', (ev) => ev.shiftKey || ev.preventDefault());

    // this.init().then(() => this.render());
  }

  async init() {
    this.program = await Program.build(this.config.program, this.config.maxDim, this.ctx);
    this.device = this.program.device;
    const { program, config } = this;

    config.put('mediaFit', program.settings.mediaFit);
    config.put('streamFit', program.settings.streamFit);

    program.hooks.add('afterCounter', (...args) => this.hooks.call('afterCounter', ...args));
    program.hooks.add('afterStatus', (...args) => this.hooks.call('afterStatus', ...args));
    program.hooks.add('afterStep', (...args) => this.afterStep(...args));

    config.testSet.add('screenShareEnabled', (v) => program.setStreamEnabled(v, 'screenShare'));
    config.testSet.add('webcamEnabled', (v) => program.setStreamEnabled(v, 'webcam'));
    config.afterSet.add('streamFit', (v) => program.setStreamFit(v));
    config.afterSet.add('mediaFit', (v) => program.setMediaFit(v));

    this.canvas.width = program.settings.dim.width;
    this.canvas.height = program.settings.dim.height;
    this.exportCanvas.width = program.settings.exportDim.width;
    this.exportCanvas.height = program.settings.exportDim.height;

    if (this.program.hasControls) {
      document.body.appendChild(this.program.controls.domElement);
    }

    this.program.playing = program.settings.autoplay ?? config.autoplay;

    this.program.run('setup');
    this.program.run('reset');
  }

  resetControls() {
    this.program.resetControls();
  }

  setTimer(cond) {
    const { settings } = this.program;
    requestAnimationFrame(() => {
      const timeDelta = Date.now() - this.stepTime;
      let interval = settings.interval;
      if (this.program.recording && cond) {
        interval = max(settings.interval, settings.recordingInterval || 0);
      }
      interval = max(0, interval - timeDelta);
      this.intervalTimer = setTimeout(() => this.step(), interval);
    });
  }

  async step() {
    this.stepTime = Date.now();
    await this.program.step();
  }

  afterStep(counter) {
    requestAnimationFrame(async() => {
      const startCond = this.program.startCond(counter);
      const stopCond = this.program.stopCond(counter);

      if (this.recording && this.recordedFrames == counter - this.program.settings.start) {
        if (startCond && !stopCond) {
          this.recordedFrames ++;
          const url = this.getDataUrl();
          await this.postFrame(url, counter);
        }
        else if (stopCond) {
          await this.toggleRecord(false);
          if (this.playing && this.program.settings.playStop) {
            await this.togglePlay(false);
          }
        }
      }

      this.playing && this.setTimer(startCond && !stopCond);
    });
  }

  getDataUrl() {
    const dim = this.program.settings.exportDim;
    this.exportCtx.clearRect(0, 0, ...dim);
    this.exportCtx.drawImage(this.canvas, 0, 0, ...dim);
    const url = this.exportCanvas.toDataURL('image/png', 1);
    return url;
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
    const url = this.getDataUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame-${('0000' + this.program.counter).slice(-4)}.png`;
    a.click();
  }

  async togglePlay(val=!this.playing) {
    const dif = val - this.playing;
    if (dif == 1) {
      await Promise.all(this.hooks.map('beforePlayingStart'));
      this.program.playing = true;
      this.step();
    }
    else {
      this.program.playing = false;
      await Promise.all(this.hooks.map('afterPlayingStop'));
    }
  }

  async toggleRecord(val=!this.recording) {
    const dif = val - this.recording;
    if (dif == 1) {
      await Promise.all(this.hooks.map('beforeRecordingStart'));
      this.program.recording = true;
      this.recordingStart = Date.now();
      this.recordedFrames = 0;
      this.program.reset();
    }
    else if (dif == -1) {
      const t = Date.now() - this.recordingStart;
      console.log(`Recorded ${this.recordedFrames} frames for ${t / 1000} seconds`)
      this.recordingStart = null;
      this.program.recording = false;
      await Promise.all(this.hooks.map('afterRecordingStop'));
    }
  }

  reset() {
    this.program.reset();
  }

  clearSwapTextures() {
    this.program.clearSwapTextures();
  }

  moveArrow([x, y]) {
    const cur = this.program.getCursorUniform('arrowDelta');
    const next = [cur[0] + x, cur[1] + y];
    this.program.setCursorUniform('arrowDelta', next);
  }

  handleResize() {
    this.boundingRect = this.canvas.getBoundingClientRect();
  }

  handleScroll(ev) {
    const delta = ev.deltaY / this.boundingRect.height;
    const cur = this.program.getCursorUniform('scrollDelta');
    this.program.setCursorUniform('scrollDelta', cur + delta);
    this.timerBuffer.add('onCursor', () => this.program.run('onCursor'), REDRAW_DELAY);
  }

  handlePointer(ev) {
    if (!this.program) return;
    const cursorOut = this.cursorOut;
    const { width, height } = this.boundingRect;
    const x = ev.offsetX / width * 2 - 1;
    const y = ev.offsetY / height * -2 + 1;
    const data = this.program.getCursorUniforms();
    let leftDown = ev.buttons % 2;
    let rightDown = (ev.buttons >> 1) % 2;

    data.lastPos = cursorOut ? [x, y] : data.pos;
    data.pos = [x, y];
    const vel = [
      data.pos[0] - data.lastPos[0],
      data.pos[1] - data.lastPos[1],
    ];
    const acc = [
      vel[0] - data.vel[0],
      vel[1] - data.vel[1],
    ];
    data.vel = vel;
    data.acc = acc;

    if (ev.type == 'pointerout' || ev.type == 'pointercancel') {
      leftDown = 0;
      rightDown = 0;
      this.cursorOut = true;
    }
    else {
      this.cursorOut = false;
    }

    if (leftDown - data.leftDown == 1) {
      data.leftDownAt = Date.now();
      data.leftDownPos = [x, y];
    }
    else if (leftDown - data.leftDown == -1) {
      data.leftUpAt = Date.now();
      data.leftUpPos = [x, y];
      data.leftDeltaLast = indexMap(2).map((idx) => {
        return data.leftDeltaLast[idx] + data.leftUpPos[idx] - data.leftDownPos[idx]
      });
      data.leftDelta = data.leftDeltaLast.slice();
    }
    else if (!!leftDown) {
      data.leftDelta = indexMap(2).map((idx) => {
        return data.leftDeltaLast[idx] + data.pos[idx] - data.leftDownPos[idx];
      });
    }
    if (rightDown - data.rightDown == 1) {
      data.rightDownAt = Date.now();
      data.rightDownPos = [x, y];
      data.rightDeltaLast = indexMap(2).map((idx) => {
        return data.rightDelta[idx] + data.rightUpPos[idx] - data.rightDownPos[idx]
      });
      data.rightDelta = data.rightDeltaLast.slice();
    }
    else if (rightDown - data.rightDown == -1) {
      data.rightUpAt = Date.now();
      data.rightUpPos = [x, y];
    }
    else if (!!rightDown) {
      data.rightDelta = indexMap(2).map((idx) => {
        return data.rightDeltaLast[idx] + data.pos[idx] - data.rightDownPos[idx];
      });
    }

    data.leftDown = leftDown;
    data.rightDown = rightDown;

    this.program.setCursorUniforms(data);

    if (
      leftDown || rightDown ||
      ['pointerup', 'pointerout', 'pointercancel'].includes(ev.type)
    ) {
      this.timerBuffer.add('onCursor', () => this.program.run('onCursor'), REDRAW_DELAY);
    }
  }

  get dim() {
    return this.program.settings.dim;
  }

  get outputSettings() {
    return this.program.settings.output;
  }

  get playing() {
    return this.program.playing;
  }

  get recording() {
    return this.program.recording;
  }
}
