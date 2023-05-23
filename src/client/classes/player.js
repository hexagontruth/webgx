import { createElement, fetchText, importObject } from '../util';

export default class Player {

  constructor(app, container) {
    this.app = app;
    this.config = app.config;
    this.container = container;

    this.canvas = createElement('canvas', { class: 'player-canvas' });
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('webgpu');

    this.canvas.addEventListener('pointerdown', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerup', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointerout', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointercancel', (ev) => app.handlePointer(ev));
    this.canvas.addEventListener('pointermove', (ev) => app.handlePointer(ev));

    this.init().then(() => this.render());
  }

  async init() {
    this.adapter = await navigator.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();
    this.ctx.configure({
      device: this.device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      alphaMode: 'premultiplied',
    });

    this.program = await importObject(`/data/programs/${this.config.program}.js`);

    await Promise.all(Object.entries(this.program.pipelines).map(async ([name, pipeline]) => {
      const shaderText = await fetchText(pipeline.shader);
      pipeline.shaderText = shaderText;
      pipeline.shaderModule = this.device.createShaderModule({
        code: shaderText,
      });
      pipeline.vertexBuffer = this.device.createBuffer({
        size: pipeline.vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      pipeline.uniformBuffer = this.device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      pipeline.uniformData = new Float32Array([
        0, 1, 1, 1,
        1, 0.5,
        0, 0,
      ]);
      this.device.queue.writeBuffer(
        pipeline.vertexBuffer, 0,
        pipeline.vertexData, 0,
        pipeline.vertexData.length
      );
      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: 'uniform',
            },
          },
        ],
      });
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
        layout: this.device.createPipelineLayout({
            bindGroupLayouts: [
              bindGroupLayout, // @group(0)
            ],
        }),
      };
      pipeline.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);
      
      pipeline.bindGroup = this.device.createBindGroup({
        layout: pipeline.renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: pipeline.uniformBuffer }},
        ],
      });
    }));
  }

  render(...pipelines) {
    this.counter = this.counter != null ? this.counter + 1 : 0;

    pipelines = pipelines.length ? pipelines : Object.keys(this.program.pipelines);
    Object.entries(this.program.pipelines).forEach(([pipelineName, pipeline]) => {
      const commandEncoder = this.device.createCommandEncoder();
      const clearColor = { r: 0.9, g: 0.5, b: 1.0, a: 1.0 };
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

      pipeline.uniformData[0] = this.counter / 12;
      this.device.queue.writeBuffer(pipeline.uniformBuffer, 0, pipeline.uniformData);
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline.renderPipeline);
      passEncoder.setVertexBuffer(0, pipeline.vertexBuffer);
      passEncoder.setBindGroup(0, pipeline.bindGroup);
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