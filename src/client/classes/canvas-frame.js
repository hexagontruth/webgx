import Session from './session';

export default class CanvasFrame {
  constructor(app, name, args={}) {
    let defaults = {
      canvas: args.canvas || document.createElement('canvas'),
      img: args.img || new Image(),
      dim: 1440,
      session: args.session || Session.get(),
      drawFn: null,
      fit: "cover"
    };
    Object.assign(this, defaults, args);

    this.app = app;
    this.name = name;
    this.isActive = false;
    this.updateQueued = 0;

    if (this.img instanceof HTMLVideoElement)
      this.isVideo = true;
    if (typeof this.dim == 'number')
      this.dim = [this.dim, this.dim];

    this.canvas.width = this.dim[0];
    this.canvas.height = this.dim[1];
    this.ctx = this.canvas.getContext('2d');
    this.ctx.translate(this.dim[0] / 2, this.dim[1] / 2);
    this.loadImageFromDb();

    if (!this.isVideo)
    this.img.onload = () => this.handleLoad();
  }

  async loadImageFromDb() {
    let obj = await this.session.db.media.get(this.name);
    if (obj) {
      let data = new Uint8Array(obj.data);
      let blob = new Blob([data], {type: obj.fileType});
      let earl = window.URL.createObjectURL(blob);
      this.img.src = earl;
    }
  }

  loadImageFromPrompt() {
    const reader = new FileReader();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    let file, fileType, fileName;

    input.onchange = () => {
      file = input.files[0];
      fileType = file.type;
      fileName = file.name;
      reader.readAsArrayBuffer(file);
    };

    reader.onload = (ev) => {
      let data = ev.target.result;
      data = new Uint8Array(data);
      let blob = new Blob([data], {type: fileType});
      let earl = window.URL.createObjectURL(blob);
      this.loadSrc(earl);
      let obj = {
        name: this.name,
        data: data,
        type: fileType
      }
      let x = this.session.db.media.put(obj);
    };

    input.click();
  }

  loadSrc(src) {
    if (this.isVideo) {
      this.img.srcObject = src;
      this.toggleActive(true);
    }
    else {
      this.img.src = src;
    }
  }

  updateFromStream() {
    this.handleLoad();

    this.updateQueued = Math.max(0, this.updateQueued - 1);
    if (this.isActive && this.updateQueued == 0) {
      this.updateQueued ++;
      window.requestAnimationFrame(() => this.updateFromStream());
    }
  }

  toggleActive(state) {
    state = state != null ? state : !this.isActive;
    this.isActive = state;
    if (state && this.updateQueued == 0) {
      this.updateQueued ++;
      this.updateFromStream();
    }
  }

  handleLoad() {
    let img = this.img;
    let [w, h] = this.isVideo ? [img.videoWidth, img.videoHeight] : [img.width, img.height];
    let r = w/h;
    let d = this.dim[0];
    let cond = this.fit == "contain" ? w > h : w < h;
    if (cond) {
      w = d;
      h = d/r;
    }
    else {
      h = d;
      w = d*r;
    }
    this.ctx.drawImage(img, -w/2, -h/2, w, h);
    this.onload && this.onload();
  }

  clear() {
    this.ctx.clearRect(-this.dim[0]/2, -this.dim[1]/2, ...this.dim);
  }

  draw() {
    this.drawFn && this.drawFn();
  }

}
