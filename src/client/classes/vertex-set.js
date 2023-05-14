import WebgxError from './webgx-error';

export default class VertexSet {
  static defaultType = Float32Array;

  constructor(stride, data) {
    this.data = ArrayBuffer.isView(data) ? data : new VertexSet.defaultType(data);
    this.type = this.data.constructor;
    this.length = this.data.length;

    if (stride.length) {
      this.stride = stride.reduce((a, e) => a + e, 0);
      this.lengthMap = stride.slice();
    }
    else {
      this.stride = stride;
      this.lengthMap = [this.stride];
    }

    let offset = 0;
    this.offsetMap = this.lengthMap.map((length, idx) => {
      const curOffset = offset;
      offset += length;
      return curOffset;
    });

    this.numVerts = this.length / this.stride;
    this.numParams = this.lengthMap.length;

    if (this.numVerts % 1 > 0) {
      throw new WebgxError(`VertexSet length ${this.length} does not match stride ${this.stride}`);
    }
  }
}