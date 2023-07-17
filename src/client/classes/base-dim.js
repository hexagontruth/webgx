export default class BaseDim extends Array {
  constructor() {
    super();
  }

  get width() {
    return this[this.length - 2];
  }
  get height() {
    return this[this.length - 1];
  }

  get w() {
    return this.width;
  }

  get h() {
    return this.height;
  }

  get dim() {
    return Array.from(this.slice(-2));
  }

  get area() {
    return this.width * this.height;
  }
  get aspectRatio() {
    return this.width / this.height;
  }

}
