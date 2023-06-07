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
      else if (arg instanceof Image || arg instanceof GPUTexture) {
        this.push(arg.width, arg.height);
      }
      else if (arg instanceof Window) {
        this.push(arg.innerWidth, arg.innerHeight);
      }
      else if (arg instanceof HTMLElement) {
        this.push(arg.offsetWidth, arg.offsetHeight);
      }
      else if (typeof arg == 'number') {
        this.push(arg, arg);
      }
      else {
        this.push(64, 64);
      }
    }
    else {
      this.push(...args);
    }
  }
}