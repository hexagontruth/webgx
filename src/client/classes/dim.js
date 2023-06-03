import BaseDim from './base-dim';

export default class Dim extends BaseDim {
  constructor(...args) {
    super();
    if (args.length == 1) {
      const arg = args[0];
      if (arg instanceof BaseDim) {
        this.push(...arg.dim);
      }
      else if (arg instanceof HTMLVideoElement) {
        this.push(arg.videoWidth, arg.videoHeight);
      }
      else if (arg instanceof Image) {
        this.push(arg.width, arg.height);
      }
      else if (typeof arg == 'number') {
        this.push(arg, arg);
      }
      else {
        this.push(0, 0);
      }
    }
    else {
      this.push(...args);
    }
  }
}