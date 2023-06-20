export default class UniformBuffer {
  constructor(device, dataMap, opts={}) {
    this.device = device;
    this.dataMap = Object.assign({}, dataMap);
    this.opts = opts;
    this.flags = opts.flags ?? GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM;
    this.allowEmpty = opts.allowEmpty ?? false;
    this.idxMap = {};
    this.length = 0;

    if (!this.allowEmpty && Object.keys(this.dataMap).length == 0) {
      dataMap = { 'null': 0 };
    }

    Object.entries(dataMap).forEach(([key, val]) => {
      val = Array.isArray(val) ? val : [val];
      this.dataMap[key] = val;
      const padding = (val.length - this.length % val.length) % val.length;
      const idx = this.length + padding;
      this.idxMap[key] = idx;
      this.length = idx + val.length;
    });
    this.length += (4 - this.length % 4) % 4;

    this.data = new Float32Array(this.length);

    Object.entries(this.dataMap).forEach(([key, val]) => {
      const idx = this.idxMap[key];
      this.data.set(val, idx);
    });

    this.buffer = this.device.createBuffer({
      size: this.length * 4,
      usage: this.flags,
    });
  }

  update(key) {
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