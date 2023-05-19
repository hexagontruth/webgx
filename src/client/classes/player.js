import { createElement, fetchText, importObject } from '../util';

export default class Player {

  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.init();
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('webgpu');
    this.ctx.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    this.program = await importObject(`/data/programs/${this.config.program}.js`);

    Promise.all(Object.entries(this.program.pipelines).map(async ([name, pipeline]) => {
      const shaderText = await fetchText(pipeline.shader);
      pipeline.shaderText = shaderText;
      pipeline.shaderModule = this.device.createShaderModule({
        code: shaderText,
      });
      const vertexBuffer = this.device.createBuffer({
        size: pipeline.vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(
        vertexBuffer, 0,
        pipeline.vertexData, 0,
        pipeline.vertexData.length
      );
    }));
  }
}