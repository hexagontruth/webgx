import { merge } from '../util';

export default class VertexBuffer {
  static defaultOpts = {
    type: 'float32',
    flags: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  };

  static arrayTypeMap = {
    float32: Float32Array,
  };

  constructor(device, numVerts, paramData, opts={}) {
    this.device = device;
    this.numVerts = numVerts;
    this.paramData = paramData.map((e) => e.slice());
    this.opts = merge({}, VertexBuffer.defaultOpts, opts);
    this.ArrayConstructor = VertexBuffer.arrayTypeMap[this.opts.type];
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
  }

  getLayout() {
    
  }
}