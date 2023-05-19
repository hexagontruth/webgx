import { fetchPath } from '../util';

export default class Player {

  constructor(config) {
    this.config = config;
    this.init();
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
  }
}