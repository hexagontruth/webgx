import { arrayWrap, indexMap, merge } from '../util';

export default class VertexBuffer {
  static defaultOpts = {
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

  constructor(device, set, opts={}) {
    this.device = device;
    this.set = set;
    opts = merge({}, VertexBuffer.defaultOpts, opts);
    this.flags = opts.flags;
    this.type = opts.type ?? VertexBuffer.defaultTypeMap[set.type.name];
    this.typeSize = VertexBuffer.typeSizeMap[this.type];

    this.buffer = this.device.createBuffer({
      size: set.length * this.typeSize,
      usage: this.flags,
    });
  }

  getLayout(startLocation=0) {
    return {
      attributes: indexMap(this.set.numParams).map((idx) => {
        return {
          shaderLocation: startLocation + idx,
          offset: this.set.offsetMap[idx] * this.typeSize,
          format: `${this.type}x${this.set.lengthMap[idx]}`,
        };
      }),
      arrayStride: this.set.stride * this.typeSize,
      stepMode: 'vertex',
    };
  }

  update(start=0, length=this.set.data.length) {
    this.device.queue.writeBuffer(
      this.buffer, start * this.typeSize,
      this.set.data, start,
      length,
    );
  }

  updateVerts(start, length=1) {
    this.update(this.set.stride * start, this.set.stride * length);
  }
}