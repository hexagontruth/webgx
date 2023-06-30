export default class DataBuffer {
  static STORAGE = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
  static MAP_READ = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
  static MAP_WRITE = GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC;
  static VERTEX = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
  static UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

  static defaultFlags = DataBuffer.STORAGE;
  static defaultType = 'float32';

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

  constructor(device, arg, flags, type) {
    this.device = device;
    this.flags = flags ?? this.constructor.defaultFlags;
    if (ArrayBuffer.isView(arg)) {
      this.data = arg;
      this.type = type || this.constructor.defaultTypeMap[arg.constructor.name];
    }
    else {
      this.type = type || this.constructor.defaultType;
      this.data = new DataBuffer.arrayTypeMap[this.type];
    }
    this.typeSize = DataBuffer.typeSizeMap[this.type];

    this.buffer = this.device.createBuffer({
      size: this.data.length * this.typeSize,
      usage: this.flags,
    });
  }
}