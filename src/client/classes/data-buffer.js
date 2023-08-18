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

  static parseTypeData(str) {
    // Assuming Float16Array will be added at some point?
    // Length property isn't doing anything at the moment
    const match = str.match(/^(u|s)?([a-z]+)(\d{1,2})(x(\d))?$/);
    if (!match) {
      throw new WebgxError(`Invalid type string: ${str}`);
    }
    const signed = match[1] != 'u';
    const type = match[2];
    const size = Number(match[3]);
    const length = Number(match[5]) || 1;
    let constructorName = signed == 'u' ? 'u' : '';
    constructorName += type == 'int' ? 'int' : 'float';
    constructorName = constructorName[0].toUpperCase() + constructorName.slice(1);
    constructorName += size;
    constructorName += 'Array';
    const constructor = window[constructorName];
    return { signed, type, size, length, constructor };
  }

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
      this.typeData = DataBuffer.parseTypeData(this.type);
    }
    else {
      this.type = type || this.constructor.defaultType;
      this.typeData = DataBuffer.parseTypeData(this.type);
      this.data = new this.typeData.constructor(data);
    }
    this.length = this.data.length;
    this.byteLength = this.data.byteLength;
    this.typeSize = this.byteLength / this.length;

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
