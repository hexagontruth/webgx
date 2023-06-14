import { indexMap, merge } from '../util';

export default class VertexBuffer {
  static defaultOpts = {
    type: 'float32',
    flags: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  };

  static defaultTypeMap = {
    Float32Array: 'float32',
    Int32Array: 'int32',
    Uint32Array: 'uint32',
  };

  static arrayTypeMap = {
    float32: Float32Array,
    int32: Int32Array,
    uint32: Uint32Array,
  };

  static typeSizeMap = {
    float32: 4,
    int32: 4,
    uint32: 4,
  };

  constructor(device, numVerts, paramData, opts={}) {
    this.device = device;
    this.numVerts = numVerts;
    paramData = Array.isArray(paramData) ? paramData : [paramData];
    this.numParams = paramData.length;
    opts = merge({}, VertexBuffer.defaultOpts, opts);
    this.flags = opts.flags;
    this.type = opts.type ?? VertexBuffer.defaultTypeMap[paramData[0].constructor.name];
    this.ArrayConstructor = VertexBuffer.arrayTypeMap[this.type];
    this.typeSize = VertexBuffer.typeSizeMap[this.type];
    this.offsetMap = [];
    this.lengthMap = [];
    this.stride = 0;
    this.length = 0;

    paramData.forEach((data) => {
      const stride = data.length / this.numVerts;
      const padding = (stride - this.length % stride) % stride;
      const offset = this.stride + padding;
      this.offsetMap.push(offset);
      this.lengthMap.push(stride);
      this.stride = offset + stride;
    });

    this.length = this.stride * this.numVerts;

    this.data = new this.ArrayConstructor(this.length);

    paramData.forEach((data, idx) => {
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
      usage: this.flags,
    });
  }

  getLayout(startLocation=0) {
    return {
      attributes: indexMap(this.numParams).map((idx) => {
        return {
          shaderLocation: startLocation + idx,
          offset: this.offsetMap[idx],
          format: `${this.type}x${this.lengthMap[idx]}`,
        };
      }),
      arrayStride: this.stride * this.typeSize,
      stepMode: 'vertex',
    };
  }

  update(idx, start, length) {
    this.device.queue.writeBuffer(
      this.buffer, 0,
      this.data, 0,
      this.data.length,
    );
  }

  get(idx, start, end) {
    // Jesus christ this is clunky
    const length = this.lengthMap[idx];
    const offset = this.offsetMap[idx];
    end = end ?? start + 1;
    const n = end - start;
    const values = new this.ArrayConstructor(n * length);
    let curPos = start * this.stride + offset;
    const endPos = end * this.stride + offset;
    
    for (let i = 0; i < n; i++) {
      values.set(this.data.subarray(curPos, curPos + length), i * length);
      curPos += this.stride;
    }
    return values;
  }

  set(idx, start, val) {
    const length = this.lengthMap[idx];
    const offset = this.offsetMap[idx];
    let destPos = start * this.stride + offset;
    let sourcePos = 0;
    while (sourcePos < val.length) {
      this.data.set(val.slice(sourcePos, sourcePos + length), destPos);
      sourcePos += length;
      destPos += this.stride;
    }
  }
}