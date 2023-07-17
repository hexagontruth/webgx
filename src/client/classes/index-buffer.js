import DataBuffer from "./data-buffer";

export default class IndexBuffer extends DataBuffer {
  static defaultFlags = DataBuffer.INDEX;
  static defaultType = 'uint32';

  constructor(device, data, flags, type) {
    super(device, data, flags, type);
  }
}
