import BaseDim from './base-dim';

export default class Box extends BaseDim {
  constructor(x=0, y=0, w=0, h=0) {
    super();
    if (isNaN(x + y + w + h)) {
      this.push(0, 0, 0, 0);
    }
    else {
      this.push(x, y, w, h);
    }
  }
  get x() {
    return this[0];
  }
  get y() {
    return this[1];
  }
  get x2() {
    return this.x + this.w;
  }
  get y2() {
    return this.y + this.h;
  }

  get pos() {
    return this.slice(0, 2);
  }
}