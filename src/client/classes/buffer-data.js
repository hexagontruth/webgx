import { merge } from '../util';

export default class BufferData {
  static createVertex(device, data) {
    return new BufferData(device, data,GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX);
  }

  static createUniform(device, data) {
    return new BufferData(device, data,GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM);
  }

  constructor(device, dataMap, flags) {
    this.device = device;
    this.dataMap = Object.assign({}, dataMap);
    this.flags = flags;
    this.idxMap = {};
    this.length = 0;

    Object.entries(dataMap).forEach(([key, val]) => {
      val = Array.isArray(val) ? val : [val];
      this.dataMap[key] = val;
      this.idxMap[key] = this.length;
      this.length += val.length;
    });

    this.data = new Float32Array(this.length);

    Object.entries(this.dataMap).forEach(([key, val]) => {
      const idx = this.idxMap[key];
      this.data.set(val, idx);
    });

    this.buffer = this.device.createBuffer({
      size: this.length * 4,
      usage: flags,
    });
  }

  update() {
    this.device.queue.writeBuffer(
      this.buffer, 0,
      this.data, 0,
      this.data.length,
    );
  }

  get(key) {
    const idx = this.idxMap[key];
    const length = this.dataMap[key].length; // Yes we could just get the value from here
    const val = this.data.slice(idx, idx + length);
    return val.length > 1 ? val : val[0];
  }

  set(key, val) {
    const idx = this.idxMap[key];
    val = Array.isArray(val) ? val : [val];
    this.data.set(val, idx);
    this.dataMap[key] = val;
  }
}