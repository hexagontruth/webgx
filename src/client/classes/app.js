import { merge, importObject } from '../util';
import Config from './config';
import Player from './player';

export default class App {
  constructor() {
    this.shiftString = '';
    
    window.addEventListener('load', () => this.init());
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener('keydown', (ev) => this.handleKey());
    window.addEventListener('keyup', (ev) => this.handleKey());
  }

  init() {
    document.body.style.opacity = '1';
    this.config = new Config();
    this.player = new Player(this, document.body);
    this.handleResize();
  }

  togglePlay(val) {
    // val = val != null ? val : !this.player.play;
    // this.player.togglePlay(val);
    // this.playButton.classList.toggle('icon-play', !val);
    // this.playButton.classList.toggle('icon-stop', val);
  }

  toggleRecord(val) {
    // val = val != null ? val : !this.player.recording;
    // this.player.toggleRecord(val);
    // this.recordButton.classList.toggle('active', val);
    // this.recordButton.classList.toggle('icon-record', !val);
    // this.recordButton.classList.toggle('icon-stop', val);
    // this.recordVideoButton.disabled = val;
  }

  toggleHidden(val) {
    val = val != null ? val : !this.config.controlsHidden;
    this.config.setControlsHidden(val);
  }

  toggleFit(val) {
    if (val == null) {
      val = this.config.fit == 'contain' ? 'cover' : 'contain';
    }
    this.config.setFit(val);
  }

  toggleStreamFit(val) {
    if (val == null) {
      val = this.config.streamFit == 'contain' ? 'cover' : 'contain';
    }
    this.config.setStreamFit(val);
  }

  toggleWebcam(val) {
    val = val != null ? val : !this.config.webcamEnabled;
    this.config.setWebcamEnabled(val);
  }

  toggleScreenShare(val) {
    val = val != null ? val : !this.config.screenShareEnabled;
    this.config.setScreenShareEnabled(val);
  }

  toggleRecordImages(val) {
    val = val != null ? val : !this.config.recordImages;
    this.config.setRecordImages(val);
  }

  toggleRecordVideo(val) {
    val = val != null ? val : !this.config.recordVideo;
    this.config.setRecordVideo(val);
  }

  set(key, val) {
    if (key == 'controlsHidden') {
      document.querySelectorAll('.hideable').forEach((el) => {
        el.classList.toggle('hidden', val);
      });
    }
    else if (key == 'fit') {
      this.handleResize();
    }
    else if (key == 'streamFit') {
      this.player?.setStreamFit(val); // This is horrendous
    }
    else if (key == 'webcamEnabled') {
      this.webcamButton.classList.toggle('active', val);
      this.player?.setStream(val ? this.config.stream : null);
    }
    else if (key == 'screenShareEnabled') {
      this.screenShareButton.classList.toggle('active', val);
      this.player?.setStream(val ? this.config.stream : null);
    }
    else if (key == 'recordImages') {
      this.recordImagesButton.classList.toggle('active', val);
      this.player?.setRecordImages();
    }
    else if (key == 'recordVideo') {
      this.recordVideoButton.classList.toggle('active', val);
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
        this.toggleHidden();
      }
      else if (ev.key == 'Tab') {
        if (ev.shiftKey)
          this.toggleRecord();
        else
          this.togglePlay();
      }
      else if (key == 'f') {
        if (ev.shiftKey)
          this.toggleStreamFit();
        else
          this.toggleFit();
      }
      else if (key == 'r') {
        this.player.resetCounter();
        return;
      }
      else if (key == 's') {
        this.toggleScreenShare();
      }
      else if (key == 'w') {
        this.toggleWebcam();
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