import DataBuffer from "./data-buffer";

export default class IndexBuffer extends DataBuffer {
  static defaultUsage = DataBuffer.INDEX;
  static defaultType = 'uint32';
}
