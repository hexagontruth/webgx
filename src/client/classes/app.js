import { merge, importObject, postJson } from '../util';
import Config from './config';
import Player from './player';

export default class App {
  static elementIds = {
    playerContainer: 'player-container',
    recordButton: 'record-button',
    playButton: 'play-button',
    loadImagesButton: 'load-images-button',
    webcamButton: 'webcam-button',
    screenShareButton: 'screen-share-button',
    recordImagesButton: 'record-images-button',
    recordVideoButton: 'record-video-button',
    statusField: 'frame-field',
    messageField: 'message-field',
  };

  constructor() {
    this.shiftString = '';

    window.addEventListener('load', () => this.init());
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('keydown', (ev) => this.handleKey(ev));
    window.addEventListener('keyup', (ev) => this.handleKey(ev));
  }

  init() {
    document.body.style.opacity = '1';

    this.elements = Object.fromEntries(Object.entries(App.elementIds).map(([k, v]) => {
      const el = document.querySelector(`#${v}`);
      if (el?.tagName == 'BUTTON') {
        el.onclick = (ev) => this.handleButton(ev);
      }
      return [k, el];
    }));

    this.config = new Config(this);
    this.player = new Player(this, this.elements.playerContainer);

    this.handleResize();
  }

  togglePlay(val) {
    const playing = this.player.togglePlay(val);
    this.elements.playButton.classList.toggle('icon-play', !playing);
    this.elements.playButton.classList.toggle('icon-stop', playing);
  }

  toggleRecord(val) {
    const recording = this.player.toggleRecord(val);
    this.elements.recordButton.classList.toggle('active', recording);
    this.elements.recordButton.classList.toggle('icon-record', !recording);
    this.elements.recordButton.classList.toggle('icon-stop', recording);
    this.elements.recordVideoButton.disabled = val;
  }

  set(key, val) {
    if (key == 'controlsHidden') {
      document.body.classList.toggle('hidden', val);
    }
    else if (key == 'fit') {
      this.handleResize();
    }
    else if (key == 'streamFit') {
      this.player?.setStreamFit(val);
    }
    else if (key == 'webcamEnabled') {
      this.elements.webcamButton.classList.toggle('active', val);
      this.player?.setStream(val ? this.config.stream : null);
    }
    else if (key == 'screenShareEnabled') {
      this.elements.screenShareButton.classList.toggle('active', val);
      this.player?.setStream(val ? this.config.stream : null);
    }
    else if (key == 'recordImages') {
      this.elements.recordImagesButton.classList.toggle('active', val);
      postJson('/api/images', { set: val });
    }
    else if (key == 'recordVideo') {
      this.elements.recordVideoButton.classList.toggle('active', val);
      postJson('/api/video', { set: val });
    }
    else {
      // TODO: Something
      console.error(`No setting configured: ${key}`);
    }
  }

  handleButton(ev) {
    const button = ev.target;
    const { elements } = this;
    if (button == elements.playButton) {
      this.togglePlay();
    }
    else if (button == elements.recordButton) {
      this.toggleRecord();
    }
    else if (button == elements.loadImagesButton) {
      /*todo*/
    }
    else if (button == elements.webcamButton) {
      this.config.toggle('webcamEnabled');
    }
    else if (button == elements.screenShareButton) {
      this.config.toggle('screenShareEnabled');
    }
    else if (button == elements.recordImagesButton) {
      this.config.toggle('recordImages');
    }
    else if (button == elements.recordVideoButton) {
      this.config.toggle('recordVideo');
    }
  }

  handleKey(ev) {
    let key = ev.key.toLowerCase();
    if (ev.type == 'keydown') {
      if (ev.ctrlKey && !ev.shiftKey) {
        if (ev.key == 's') {
          // this.player.promptDownload();
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
        if (ev.shiftKey)
          this.config.toggle('streamFit');
        else
          this.config.toggle('fit');
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
        document.body.classList.toggle('gray');
      }
      else if (ev.key == ' ') {
        if (this.player.play)
          this.togglePlay(false);
        else
          this.player.animate();
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
    this.player?.handleResize();
  }
}