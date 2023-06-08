import { merge, importObject, postJson } from '../util';
import Config from './config';
import Dim from './dim';
import FitBox from './fit-box';
import Player from './player';

const { body } = document;

export default class App {
  static elementIds = {
    mainContainer: 'main-container',
    playerContainer: 'player-container',
    recordButton: 'record-button',
    playButton: 'play-button',
    loadImagesButton: 'load-images-button',
    webcamButton: 'webcam-button',
    screenShareButton: 'screen-share-button',
    recordImagesButton: 'record-images-button',
    recordVideoButton: 'record-video-button',
    counterField: 'counter-field',
    messageField: 'message-field',
  };

  constructor() {
    this.shiftString = '';
    this.styleDim = null;
    
    window.addEventListener('load', () => this.init());
  }

  async init() {
    body.style.opacity = '1';

    this.els = Object.fromEntries(Object.entries(App.elementIds).map(([k, v]) => {
      const el = document.querySelector(`#${v}`);
      if (el?.tagName == 'BUTTON') {
        el.onclick = (ev) => this.handleButton(ev);
      }
      return [k, el];
    }));

    this.config = new Config();
    this.player = await Player.build(this.config, this.els.playerContainer);
    
    this.player.hooks.add('afterCounter', (val) => this.els.counterField.value = val);
    this.player.hooks.add('onPointer', (ev) => this.handlePointer(ev));

    this.config.afterSet.add('controlsHidden', (val) => {
      body.classList.toggle('hidden', val);
    });
    this.config.afterSet.add('webcamEnabled', (val) => {
      this.els.webcamButton.classList.toggle('active', val);
    });
    this.config.afterSet.add('screenShareEnabled', (val) => {
      this.els.screenShareButton.classList.toggle('active', val);
    });
    this.config.afterSet.add('recordImages', (val) => {
      this.els.recordImagesButton.classList.toggle('active', val);
      postJson('/api/images', { set: val });
    });
    this.config.afterSet.add('recordVideo', (val) => {
      this.els.recordVideoButton.classList.toggle('active', val);
      const data = {
        set: val,
      };
      if (val && this.player) {
        data.settings = this.player.program.settings.output;
      }
      postJson('/api/video', data);
    });

    await this.config.setAll();
    await this.player.init();
    await this.player.draw();

    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('keydown', (ev) => this.handleKey(ev));
    window.addEventListener('keyup', (ev) => this.handleKey(ev));
    
    this.handleResize();
  }

  togglePlay(val) {
    const playing = this.player.togglePlay(val);
    this.els.playButton.classList.toggle('icon-play', !playing);
    this.els.playButton.classList.toggle('icon-stop', playing);
  }

  toggleRecord(val) {
    const recording = this.player.toggleRecord(val);
    this.els.recordButton.classList.toggle('active', recording);
    this.els.recordButton.classList.toggle('icon-record', !recording);
    this.els.recordButton.classList.toggle('icon-stop', recording);
    this.els.recordVideoButton.disabled = val;
  }

  handleButton(ev) {
    const button = ev.target;
    const { els } = this;
    if (button == els.playButton) {
      this.togglePlay();
    }
    else if (button == els.recordButton) {
      this.toggleRecord();
    }
    else if (button == els.loadImagesButton) {
      /*todo*/
    }
    else if (button == els.webcamButton) {
      this.config.toggle('webcamEnabled');
    }
    else if (button == els.screenShareButton) {
      this.config.toggle('screenShareEnabled');
    }
    else if (button == els.recordImagesButton) {
      this.config.toggle('recordImages');
    }
    else if (button == els.recordVideoButton) {
      this.config.toggle('recordVideo');
    }
  }

  handleKey(ev) {
    let key = ev.key.toLowerCase();
    if (ev.type == 'keydown') {
      if (ev.ctrlKey && !ev.shiftKey) {
        if (ev.key == 's') {
          this.player.promptDownload();
        }
        else if (ev.key.match(/^[0-9a-fA-F]$/)) {
          this.shiftString += ev.key
        }
        else {
          return;
        }
        ev.preventDefault();
      }
      else if (ev.shiftKey && ev.key == 'Escape') {
        this.config.toggle('controlsHidden');
      }
      else if (ev.key == 'Tab') {
        if (ev.shiftKey)
          this.toggleRecord();
        else
          this.togglePlay();
      }
      else if (key == 'f') {
        if (ev.shiftKey) {
          if (ev.metaKey) {
            this.config.toggle('mediaFit');
          }
          else {
            this.config.toggle('streamFit');
          }
        }
        else {
          this.config.toggle('fit');
        }
      }
      else if (key == 'r') {
        this.player.resetCounter();
        return;
      }
      else if (key == 's') {
        this.config.toggle('screenShareEnabled');
      }
      else if (key == 'w') {
        this.config.toggle('webcamEnabled');
      }
      else if (key == 'b') {
        body.classList.toggle('gray');
      }
      else if (ev.key == ' ') {
        if (this.player.play)
          this.togglePlay(false);
        else
          this.player.draw();
      }
      else if (ev.key == 'ArrowUp' || ev.key == 'ArrowDown') {
        const dir = ev.key == 'ArrowUp' ? -1 : 1;
        const activeControl = document.activeElement?.parentNode;
        if (activeControl?.classList.contains('control')) {
          const container = activeControl.parentNode;
          const controls = Array.from(container.childNodes);
          const curIdx = controls.indexOf(activeControl);
          const nextIdx = (curIdx + dir + controls.length) % controls.length;
          controls[nextIdx].tabIndex = 5;
          controls[nextIdx].querySelector('.control-input').focus();
        }
      }
      else {
        return;
      }
      ev.preventDefault();
    }
    else {
      if (ev.key == 'Control') {
        if (this.shiftString.length == 3 || this.shiftString.length == 6) {
          let code = '#' + this.shiftString;
          this.body.style.backgroundColor = code;
        }
        this.shiftString = '';
      }
    }
  }

  handlePointer(ev) {
    if (!this.player?.uniforms)
      return;
    this.player.uniforms.cursorLast = this.player.uniforms.cursorPos;
    this.player.uniforms.cursorPos = [
      ev.offsetX / this.styleDim * 2 - 1,
      ev.offsetY / this.styleDim * -2 + 1,
    ];

    if (ev.type == 'pointerdown') {
      this.player.cursorDown = true;
      this.player.uniforms.cursorLast = this.player.uniforms.cursorPos.slice();
    }
    else if (ev.type == 'pointerup' || ev.type == 'pointerout' || ev.type == 'pointercancel') {
      this.player.cursorDown = false;
    }

    this.player.uniforms.cursorAngle = Math.atan2(ev.offsetY, ev.offsetX);
  }

  handleResize() {
    const program = this.player?.program;
    if (!program) return;
    const fitBox = new FitBox(...new Dim(window), 1, 1, program.settings.fit);
    this.els.mainContainer.style.inset = fitBox.inset;
  }
}