import { merge } from '../util';

export default class IndexBuffer {
  static defaultOpts = {
    flags: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  };

  static typeMap = {
    Uint16Array: 'uint16',
    Uint32Array: 'uint32',
  };

  static typeSizeMap = {
    uint16: 2,
    uint32: 4,
  };

  constructor(device, data, opts={}) {
    this.device = device;
    this.data = data;
    opts = merge({}, IndexBuffer.defaultOpts, opts);
    this.flags = opts.flags;
    this.type = opts.type ?? IndexBuffer.typeMap[data.constructor.name];
    this.typeSize = IndexBuffer.typeSizeMap[this.type];

    this.buffer = this.device.createBuffer({
      size: data.length * this.typeSize,
      usage: this.flags,
    });
  }

  update(start=0, length=this.data.length) {
    this.device.queue.writeBuffer(
      this.buffer, start * this.typeSize,
      this.data, start,
      length,
    );
  }

  get length() {
    return this.data.length;
  }

  get byteLength() {
    return this.data.byteLength;
  }
}