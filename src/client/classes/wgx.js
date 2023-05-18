export default class Wgx {

  constructor() {
    this.init();
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
  }
}