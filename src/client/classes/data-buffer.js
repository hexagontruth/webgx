import WebgxError from "./webgx-error";

export default class DataBuffer {
  static INDEX = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
  static MAP_READ = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  static MAP_WRITE = GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC;
  static STORAGE_WRITE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  static STORAGE_READ = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  static UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  static VERTEX = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

  static defaultUsage = DataBuffer.STORAGE_READ;
  static defaultType = 'float32';

  static defaultTypeMap = {
    Float32Array: 'float32',
    Int32Array: 'int32',
    Uint16Array: 'uint16',
    Uint32Array: 'uint32',
  };

  static parseType(str) {
    // Assuming Float16Array will be added at some point?
    // Vector length property is matched but ignored
    const match = str.match(/^(u|s)?([a-z]+)(\d{1,2})(x(\d))?$/);
    if (!match) {
      throw new WebgxError(`Invalid type string: ${str}`);
    }
    const signed = match[1] != 'u';
    const type = match[2];
    const typeSize = Number(match[3]) / 8;
    let constructorName = signed == 'u' ? 'u' : '';
    constructorName += type == 'int' ? 'int' : 'float';
    constructorName = constructorName[0].toUpperCase() + constructorName.slice(1);
    constructorName += typeSize * 8;
    constructorName += 'Array';
    const dataConstructor = window[constructorName];
    return { signed, typeSize, dataConstructor };
  }

  static parseUsage(usage) {
    if (typeof usage == 'string') {
      return DataBuffer[usage];
    }
    else if (Array.isArray(usage)) {
      return usage.reduce((a, e) => a | DataBuffer.parseUsage(e), 0);
    }
    else {
      return usage;
    }
  }

  constructor(device, length, opts={}) {
    this.device = device;
    this.length = length;

    this.type = opts.type || this.constructor.defaultType;

    this.usage = DataBuffer.parseUsage(opts.usage) ?? this.constructor.defaultUsage;

    Object.assign(this, DataBuffer.parseType(this.type));

    this.byteLength = this.typeSize * this.length;

    this.buffer = this.device.createBuffer({
      size: this.byteLength,
      usage: this.usage,
    });
  }

  hasFlag(flag) {
    return !!(this.usage & flag);
  }

  getLayout() {
    let type = 'uniform';
    if (this.hasFlag(GPUBufferUsage.STORAGE)) {
      type = this.hasFlag(GPUBufferUsage.COPY_SRC) ? 'storage' : 'read-only-storage';
    }
    return { buffer: { type } };
  }

  write(data, offset=0, dataOffset, size) {
    if (!this.hasFlag(GPUBufferUsage.COPY_DST)) {
      throw new WebgxError('Buffer usage does not include COPY_DST');
    }
    if (Array.isArray(data)) {
      data = new this.dataConstructor(data);
    }
    this.device.queue.writeBuffer(this.buffer, offset * this.typeSize, data, dataOffset, size);
  }

  view(start=0, length) {
    const end = length ? start + length : this.length;
    return this.data.subarray(start, end);
  }

  map(offset=0, size) {
    size = size ?? this.byteLength - offset;
    let mode;
    if (this.usage & GPUBufferUsage.MAP_READ) {
      mode = GPUMapMode.READ;
    }
    else if (this.usage & GPUBufferUsage.MAP_WRITE) {
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
