import WebgxError from "./webgx-error";

export default class DataBuffer {
  static INDEX = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
  static MAP_READ = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  static MAP_WRITE = GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC;
  static STORAGE_WRITE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  static STORAGE_READ = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  static UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  static VERTEX = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

  static defaultFlags = DataBuffer.STORAGE_READ;
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
    this.flagSet = Object.entries(GPUBufferUsage).filter((e) => e[1] & this.flags).map((e) => e[0]);
    data && this.setData(data, type);
  }

  setData(data, type) {
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

    this.hasFlag(GPUBufferUsage.COPY_DST) && this.write();
  }

  hasFlag(flag) {
    return !!(this.flags & flag);
  }

  getLayout() {
    let type = 'uniform';
    if (this.hasFlag(GPUBufferUsage.STORAGE)) {
      type = this.hasFlag(GPUBufferUsage.COPY_SRC) ? 'storage' : 'read-only-storage';
    }
    return { buffer: { type } };
  }

  write(start=0, length=this.data.length) {
    if (!this.hasFlag(GPUBufferUsage.COPY_DST)) {
      throw new WebgxError('Buffer usage does not include COPY_DST');
    }
    this.device.queue.writeBuffer(
      this.buffer, start * this.typeSize,
      this.data, start,
      length,
    );
  }

  view(start=0, length) {
    const end = length ? start + length : this.length;
    return this.data.subarray(start, end);
  }

  map(offset=0, size) {
    size = size ?? this.byteLength - offset;
    let mode;
    if (this.flags & GPUBufferUsage.MAP_READ) {
      mode = GPUMapMode.READ;
    }
    else if (this.flags & GPUBufferUsage.MAP_WRITE) {
      mode = GPUMapMode.WRITE;
    }
    else {
      throw new WebgxError('Buffer does not have map usage');
    }
    return this.buffer.mapAsync(mode, offset, size);
  }

  getMappedRange(offset=0, size) {
    size = size ?? this.byteLength - offset;
    return this.buffer.getMappedRange(offset, size);
  }

  unmap() {
    this.buffer.unmap();
  }

  get mapState() {
    return this.buffer.mapState;
  }
}
