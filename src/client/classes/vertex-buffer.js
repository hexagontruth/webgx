import { indexMap } from '../util';
import DataBuffer from './data-buffer';
import WebgxError from './webgx-error';

export default class VertexBuffer extends DataBuffer {
  static defaultUsage = DataBuffer.VERTEX;

  constructor(device, length, stride=4, opts={}) {
    super(device, length, opts);

    if (Array.isArray(stride)) {
      this.stride = stride.reduce((a, e) => a + e, 0);
      this.lengthMap = stride.slice();
    }
    else {
      this.stride = stride;
      this.lengthMap = [this.stride];
    }

    let offset = 0;
    this.offsetMap = this.lengthMap.map((length) => {
      const curOffset = offset;
      offset += length;
      return curOffset;
    });

    this.numVerts = this.length / this.stride;
    this.numParams = this.lengthMap.length;

    if (this.numVerts % 1 > 0) {
      throw new WebgxError(
        `VertexBuffer length ${this.length} does not match stride ${this.stride}`
      );
    }
  }

  getVertexLayout(startLocation=0) {
    return {
      attributes: indexMap(this.numParams).map((idx) => {
        return {
          shaderLocation: startLocation + idx,
          offset: this.offsetMap[idx] * this.typeSize,
          format: `${this.type}x${this.lengthMap[idx]}`,
        };
      }),
      arrayStride: this.stride * this.typeSize,
      stepMode: 'vertex',
    };
  }
}
