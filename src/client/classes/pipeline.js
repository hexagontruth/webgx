import { merge } from '../util';

import UniformBuffer from './uniform-buffer';
import VertexBuffer from './vertex-buffer';
window.VertexBuffer = VertexBuffer;

export default class Pipeline {
  static generateDefaults() {
    return {
      shader: 'default.wgsl',
      params: {},
      vertexData: new Float32Array([
        -1, -1, 0, 1, 1, 1, 0, 1,
        1, -1, 0, 1, 0, 0, 1, 1,
        -1, 1, 0, 1, 1, 0, 1, 1,
        1, 1, 0, 1, 0, 1, 1, 1,
      ]),
      vertexBufferLayouts: [
        {
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x4',
            },
            {
              shaderLocation: 1,
              offset: 16,
              format: 'float32x4',
            },
          ],
          arrayStride: 32,
          stepMode: 'vertex',
        },
        {
          attributes: [
            {
              shaderLocation: 2,
              offset: 0,
              format: 'float32x4',
            },
            {
              shaderLocation: 3,
              offset: 16,
              format: 'float32x4',
            },
          ],
          arrayStride: 32,
          stepMode: 'vertex',
        },
      ],
      customUniforms: {},
    };
  }

  static async buildAll(program, defs) {
    const pipelineArray = Promise.all(
      Object.entries(defs).map(([k, v]) => Pipeline.build(program, k, v))
    );
    return Object.fromEntries((await pipelineArray).map((e) => [e.name, e]));
  }

  static async build(program, name, data) {
    const pipeline = new Pipeline(program, name, data);
    await pipeline.init();
    return pipeline;
  }

  constructor(program, name, data) {
    this.data = merge({}, Pipeline.generateDefaults(), data);
    if (Object.keys(this.data.customUniforms).length == 0) {
      this.data.customUniforms = { 'null': 0 };
    }
    this.program = program;
    this.name = name;
    this.device = program.device;
    this.settings = program.settings;
    this.vertexData = this.data.vertexData.slice();
  }

  async init() {
    const { settings } = this;
    this.shaderText = await this.program.loadShader(this.data.shader, this.data.params);

    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });

    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.customUniforms = new UniformBuffer(this.device, this.data.customUniforms);
    this.device.queue.writeBuffer(
      this.vertexBuffer, 0,
      this.vertexData, 0,
      this.vertexData.length
    );

    this.customGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    this.customGroup = this.device.createBindGroup({
      layout: this.customGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.customUniforms.buffer },
        }
      ],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: 'vertex_main',
        buffers: this.data.vertexBufferLayouts,
      },
      fragment: {
        module: this.shaderModule,
        entryPoint: 'fragment_main',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: 'triangle-strip',
        unclippedDepth: this.program.features.includes('depth-clip-control') ? true : undefined,
      },
      layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            this.program.swapGroupLayout,
            this.customGroupLayout,
          ],
      }),
    });
  }

  render(txIdx) {
    const { device, program, settings } = this;
    const { counter, cur, next } = program;

    this.customUniforms.update();

    const commandEncoder = device.createCommandEncoder();
    const clearColor = { r: 0.2, g: 0.5, b: 1.0, a: 1.0 };
    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: 'load',
          storeOp: 'store',
          view: program.drawTexture.createView(),
        },
      ],
    };
    
    device.queue.writeBuffer(
      this.vertexBuffer, 0,
      this.vertexData, 0,
      this.vertexData.length
    );

    commandEncoder.copyTextureToTexture(
      {
        texture: program.drawTexture,
      },
      {
        texture: program.inputTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
      },
    );
    commandEncoder.copyTextureToTexture(
      {
        texture: program.renderTextures[cur],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        texture: program.lastTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setVertexBuffer(1, this.vertexBuffer);
    passEncoder.setBindGroup(0, this.program.swapGroups[cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.draw(4);
    passEncoder.end();

    commandEncoder.copyTextureToTexture(
      {
        texture: program.drawTexture,
      },
      {
        texture: program.renderTextures[next],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
    device.queue.submit([commandEncoder.finish()]);
  }
}