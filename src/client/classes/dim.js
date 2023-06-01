export default class Dim extends Array {
  constructor(...args) {
    super();
    if (args.length == 1) args = args.concat(args);
    this.push(...args);
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

}
window.Dim = Dim;