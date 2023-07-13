import WebgxError from "./webgx-error";

export default class DataBuffer {
  static INDEX = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
  static MAP_READ = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  static MAP_WRITE = GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC;
  static STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  static UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  static VERTEX = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

  static defaultFlags = DataBuffer.STORAGE;
  static defaultType = 'float32';

  static defaultTypeMap = {
    Float32Array: 'float32',
    Int32Array: 'int32',
    Uint16Array: 'uint16',
    Uint32Array: 'uint32',
  };

  static arrayTypeMap = {
    float32: Float32Array,
    int32: Int32Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
  };

  static typeSizeMap = {
    float32: 4,
    int32: 4,
    uint16: 2,
    uint32: 4,
  };

  constructor(device, data, flags, type) {
    this.device = device;
    this.flags = flags ?? this.constructor.defaultFlags;
    if (ArrayBuffer.isView(data)) {
      this.data = data;
      this.type = type || this.constructor.defaultTypeMap[data.constructor.name];
    }
    else {
      this.type = type || this.constructor.defaultType;
      this.data = new DataBuffer.arrayTypeMap[this.type](data);
    }
    this.typeSize = DataBuffer.typeSizeMap[this.type];
    this.length = this.data.length;
    this.byteLength = this.data.byteLength;

    this.buffer = this.device.createBuffer({
      size: this.byteLength,
      usage: this.flags,
    });

    this.hasFlag(GPUBufferUsage.COPY_DST) && this.update();
  }

  hasFlag(flag) {
    return !!(this.flags & flag);
  }

  update(start=0, length=this.data.length) {
    if (!this.hasFlag(GPUBufferUsage.COPY_DST)) {
      throw new WebgxError('Buffer usage does not include COPY_DST');
    }
    this.device.queue.writeBuffer(
      this.buffer, start * this.typeSize,
      this.data, start,
      length,
    );
  }
}