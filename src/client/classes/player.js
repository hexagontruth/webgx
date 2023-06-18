import * as dat from 'dat.gui';

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
    this.cursorOut = true;

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
    this.canvas.addEventListener('contextmenu', (ev) => ev.shiftKey || ev.preventDefault());

    // this.init().then(() => this.render());
  }

  async init() {
    this.program = await Program.build(this.config.program, this.config.maxDim, this.ctx);
    this.device = this.program.device;

    const { program, config } = this;

    config.put('mediaFit', this.program.settings.mediaFit);
    config.put('streamFit', this.program.settings.streamFit);

    program.hooks.add('afterCounter', (...args) => this.hooks.call('afterCounter', ...args));

    config.testSet.add('screenShareEnabled', (v) => program.setStreamEnabled(v, 'screenShare'));
    config.testSet.add('webcamEnabled', (v) => program.setStreamEnabled(v, 'webcam'));
    config.afterSet.add('streamFit', (v) => program.setStreamFit(v));
    config.afterSet.add('mediaFit', (v) => program.setMediaFit(v));

    this.canvas.width = program.settings.dim.width;
    this.canvas.height = program.settings.dim.height;
    this.exportCanvas.width = program.settings.exportDim.width;
    this.exportCanvas.height = program.settings.exportDim.height;

    if (this.program.hasControls) {
      this.controls = new dat.GUI({ name: 'main', autoPlace: false});
      this.controllers = {};
      this.addControllers(
        this.program.controlData,
        this.program.controlDefs,
        this.controls,
        this.controllers,
      );
      document.body.appendChild(this.controls.domElement);
    }

    this.program.run('setup');
  }

  addControllers(data, defs, controlGroup, controllers) {
    Object.entries(data).forEach(([key, val]) => {
      const def = defs[key];
      let controller;
      if (val.constructor === Object) {
        const childGroup = controlGroup.addFolder(key);
        controllers[key] = {};
        this.addControllers(val, def, childGroup, controllers[key]);
        return;
      } 
      if (typeof val == 'string') {
        controller = controlGroup.addColor(data, key);
      }
      else {
        controller = controlGroup.add(data, key, ...def.slice(1));
      }
      controllers[key] = controller;
      controller.onChange((e) => this.program.run('controlChange', key, e));
    });
  };

  setTimer(cond) {
    const { settings } = this.program;
    requestAnimationFrame(() => {
      let interval = settings.interval;
      if (this.program.recording && cond) {
        interval = max(settings.interval, settings.recordingInterval || 0);
      }
      this.intervalTimer = setTimeout(() => this.draw(), interval);
    });
  }

  async draw() {
    this.program.stepCounter();
    this.program.updateGlobalUniforms();
    await this.program.updateStreams();
    await this.program.run();
    requestAnimationFrame(() => this.endFrame(), 0);
  }

  endFrame() {
    const counter = this.program.counter;
    const cond = this.program.frameCond(counter);
    if (this.program.recording && cond) {
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

  toggleRecord(val=!this.program.recording) {
    this.program.recording = val;
    val && this.program.resetCounter();
  }

  resetCounter() {
    this.program.resetCounter();
    this.program.run('reset');
    this.play || this.draw();
  }

  clearRenderTextures() {
    this.program.clearRenderTextures();
  }

  handleResize() {
    this.boundingRect = this.canvas.getBoundingClientRect();
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
    }
    else if (leftDown - data.leftDown == -1) {
      data.leftUpAt = Date.now();
    }
    if (rightDown - data.rightDown == 1) {
      data.rightDownAt = Date.now();
    }
    else if (rightDown - data.rightDown == -1) {
      data.rightUpAt = Date.now();
    }

    data.leftDown = leftDown;
    data.rightDown = rightDown;

    this.program.setCursorUniforms(data);
  }

  getDim() {
    return this.program.settings.dim;
  }
}