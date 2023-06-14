import { merge } from '../util';

export default class VertexBuffer {
  static defaultOpts = {
    type: 'float32',
    flags: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  };

  static arrayTypeMap = {
    float32: Float32Array,
  };

  static typeSizeMap = {
    float32: 4,
  };

  constructor(device, numVerts, paramData, opts={}) {
    this.device = device;
    this.numVerts = numVerts;
    this.paramData = paramData.map((e) => e.slice());
    this.opts = merge({}, VertexBuffer.defaultOpts, opts);
    this.ArrayConstructor = VertexBuffer.arrayTypeMap[this.opts.type];
    this.typeSize = VertexBuffer.typeSizeMap[this.opts.type];
    this.offsetMap = [];
    this.lengthMap = [];
    this.stride = 0;
    this.length = 0;

    this.paramData.forEach((data) => {
      const stride = data.length / this.numVerts;
      const padding = (stride - this.length % stride) % stride;
      const offset = this.stride + padding;
      this.offsetMap.push(offset);
      this.lengthMap.push(stride);
      this.stride = offset + stride;
    });

    this.length = this.stride * this.numVerts;

    this.data = new this.ArrayConstructor(this.length);

    this.paramData.forEach((data, idx) => {
      const offset = this.offsetMap[idx];
      const length = this.lengthMap[idx];
      for (let j = 0; j < this.numVerts; j++) {
        const slice = data.slice(j * length, j * length + length);
        const startIdx = this.stride * j + offset;
        this.data.set(slice, startIdx);
      }
    });

    this.buffer = this.device.createBuffer({
      size: this.length * this.typeSize,
      usage: this.opts.flags,
    });
  }

  update() {
    this.device.queue.writeBuffer(
      this.buffer, 0,
      this.data, 0,
      this.data.length,
    );
  }

  getLayout(startLocation=0) {
    return   {
      attributes: this.paramData.map((_, idx) => {
        return {
          shaderLocation: startLocation + idx,
          offset: this.offsetMap[idx],
          format: `${this.opts.type}x${this.lengthMap[idx]}`,
        };
      }),
      arrayStride: this.stride,
      stepMode: 'vertex',
    };
  }

  get(idx, start, end) {
    const length = this.lengthMap[idx];
    const data = this.paramData[idx];
    start = start * length;
    end = (end ?? start + 1) * length;
    return data.slice(start, end);
  }

  set(idx, start, val) {
    const data = this.paramData[idx];
    const length = this.lengthMap[idx];
    const offset = this.offsetMap[idx];
    start = start * length;
    // Not using splice b/c of arg length concerns
    for (let i = 0; i < val.length; i++) {
      data[start + i] = val[i];
    }
    this.data.set(val, start * length + offset);
  }
}