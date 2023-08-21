export default class UniformBuffer {
  static flags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

  constructor(device, dataMap) {
    this.device = device;

    if (Object.keys(dataMap).length == 0) {
      dataMap = { 'null': 0 };
    }
    this.dataMap = Object.assign({}, dataMap);
    this.dataKeys = Object.keys(this.dataMap);

    this.idxMap = {};
    let length = 0;

    Object.entries(dataMap).forEach(([key, val]) => {
      val = Array.isArray(val) ? val : [val];
      this.dataMap[key] = val;
      let alignment = 2 ** Math.ceil(Math.log2(val.length));
      const padding = (alignment - length % alignment) % alignment;
      const idx = length + padding;
      this.idxMap[key] = idx;
      length = idx + val.length;
    });
    length += (4 - length % 4) % 4;

    this.data = new Float32Array(length);
    this.buffer = this.device.createBuffer({
      size: length * 4,
      usage: UniformBuffer.flags,
    })

    this.set(this.dataMap);
  }

  write(key, val) {
    if (val !== undefined) {
      this.set(key, val);
    }
    const [start, length] = key ?
      [this.idxMap[key], this.dataMap[key].length] :
      [0, this.data.length];
    this.device.queue.writeBuffer(
      this.buffer, start * 4,
      this.data, start,
      length,
    );
  }

  has(key) {
    return this.dataMap[key] !== undefined;
  }

  get(key) {
    const idx = this.idxMap[key];
    const length = this.dataMap[key].length; // Yes we could just get the value from here
    const val = Array.from(this.data.slice(idx, idx + length));
    return val.length > 1 ? val : val[0];
  }

  getAll() {
    return Object.fromEntries(Object.entries(this.dataMap).map(([k]) => [k, this.get(k)]));
  }

  set(key, val) {
    if (typeof key == 'object') {
      Object.entries(key).forEach(([k, v]) => this.set(k, v));
    }
    else if (typeof val == 'string') {
      // Assume six-digit hex string
      const match = val.match(/^#(\w{2})(\w{2})(\w{2})$/);
      const channels = match.slice(1, 4).map((e) => parseInt(e, 16) / 255);
      channels.push(1);
      this.set(key, channels);
    }
    else {
      const idx = this.idxMap[key];
      val = Array.isArray(val) ? val : [Number(val)];
      this.data.set(val, idx);
      this.dataMap[key] = val;
    }
  }
}
