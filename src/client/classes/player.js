import { createElement, fetchText, importObject } from '../util';

export default class Player {

  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.init();
  }

  async init() {
    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');

    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
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
      pipeline.vertexBuffer = this.device.createBuffer({
        size: pipeline.vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(
        pipeline.vertexBuffer, 0,
        pipeline.vertexData, 0,
        pipeline.vertexData.length
      );
      const pipelineDescriptor = {
        vertex: {
          module: pipeline.shaderModule,
          entryPoint: 'vertex_main',
          buffers: pipeline.vertexBuffers,
        },
        fragment: {
          module: pipeline.shaderModule,
          entryPoint: 'fragment_main',
          targets: [
            {
              format: navigator.gpu.getPreferredCanvasFormat(),
            },
          ],
        },
        primitive: {
          topology: 'triangle-strip',
        },
        layout: 'auto',
      };
      pipeline.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);

    }));
  }

  async render(...pipelines) {
    pipelines = pipelines.length ? pipelines : Object.keys(this.program.pipelines);
    Object.entries(this.program.pipelines).forEach(([pipelineName, pipeline]) => {
      const commandEncoder = this.device.createCommandEncoder();
      const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

      const renderPassDescriptor = {
        colorAttachments: [
          {
            clearValue: clearColor,
            loadOp: 'clear',
            storeOp: 'store',
            view: this.ctx.getCurrentTexture().createView(),
          },
        ],
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      passEncoder.setPipeline(pipeline.renderPipeline);
      passEncoder.setVertexBuffer(0, pipeline.vertexBuffer);
      passEncoder.draw(4);
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
    });
  }

  handleResize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }
}