import { indexMap, merge } from '../util';
import DataBuffer from './data-buffer';

export default class VertexBuffer extends DataBuffer {
  static defaultFlags = DataBuffer.VERTEX;

  constructor(device, set, flags, type) {
    super(device, set.data, flags, type);
    this.set = set;
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

  get numParams() {
    return this.set.numParams;
  }

  get numVerts() {
    return this.set.numVerts;
  }
}