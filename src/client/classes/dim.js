export default class Dim extends Array {
  constructor(...args) {
    super();
    if (args.length == 1) {
      if (args[0] instanceof Dim) {
        this.push(...args[0]);
      }
      else if (typeof args[0] == 'number') {
        this.push(...args.concat(args));
      }
      else {
        this.push(0, 0);
      }
    } else {
      this.push(...args);
    }
  }
  get width() {
    return this[0];
  }
  get height() {
    return this[1];
  }

  get depth() {
    return this[2];
  }

  get w() {
    return this.width;
  }

  get h() {
    return this.height;
  }

  get d() {
    return this.depth;
  }

  get area() {
    return this[0] * this[1];
  }
}