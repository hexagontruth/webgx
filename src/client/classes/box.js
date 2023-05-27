export default class Box extends Array {
  // TODO: Make this work with boxes and offsets
  static fitOffset(pw, ph, cw, ch, mode='contain') {
    const pr = pw / ph;
    const cr = cw / ch;
    let x, y;
  
    if (mode == 'contain') {
      if (cr > pr) {
        // Child rectangle is wider than parent
        const scaleFactor = pw / cw;
        cw = pw;
        ch *= scaleFactor;
      } else {
        // Child rectangle is taller than parent or has the same aspect ratio
        const scaleFactor = ph / ch;
        ch = ph;
        cw *= scaleFactor;
      }
    }
    else {
      if (cr > pr) {
        // Child rectangle is wider than parent or has the same aspect ratio
        const scaleFactor = ph / ch;
        ch = ph;
        cw *= scaleFactor;
      } else {
        // Child rectangle is taller than parent
        const scaleFactor = pw / cw;
        cw = pw;
        ch *= scaleFactor;
      }
    }
  
    // Calculate the position of the child rectangle relative to the parent
    x = (pw - cw) / 2;
    y = (ph - ch) / 2;
  
    // return { top: y, left: x, bottom: y2, right: x2 };
    return new Box(x, y, cw, ch);
  }

  constructor(x=0, y=0, w=0, h=0) {
    super();
    if (isNaN(x + y + w + h)) {
      this.push(0, 0, 0, 0);
    }
    else {
      this.push(x, y, w, h);
    }
    [this.x, this.y, this.w, this.h] = this;
    this.x2 = this.x + this.w;
    this.y2 = this.y + this.h;
    this.aspectRatio = this.w / this.h;
  }
}