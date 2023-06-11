import { merge } from '../util';

import BufferData from './buffer-data';

export default class Pipeline {
  static generateDefaults() {
    return {
      shader: 'default.wgsl',
      params: {},
      vertexData: new Float32Array([
        -1, -1, 0, 1,
        1, -1, 0, 1,
        -1, 1, 0, 1,
        1, 1, 0, 1,
      ]),
      vertexBuffers: [
        {
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x4',
            },
          ],
          arrayStride: 16,
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
    this.globalUniforms = BufferData.createUniform(this.device, this.program.globalUniformData);
    this.customUniforms = BufferData.createUniform(this.device, this.data.customUniforms);
    this.device.queue.writeBuffer(
      this.vertexBuffer, 0,
      this.vertexData, 0,
      this.vertexData.length
    );

    this.uniformGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    });

    this.uniformGroup = this.device.createBindGroup({
      layout: this.uniformGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.globalUniforms.buffer },
        },
        {
          binding: 1,
          resource: { buffer: this.customUniforms.buffer },
        }
      ],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: 'vertex_main',
        buffers: this.data.vertexBuffers,
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
            this.uniformGroupLayout,
          ],
      }),
    });

  }

  render(txIdx) {
    const { device, program, settings } = this;
    const { counter, cur, next } = program;

    this.globalUniforms.set('time', (counter / settings.period) % 1);
    this.globalUniforms.set('clock', Date.now());
    this.globalUniforms.set('counter', counter);
    this.globalUniforms.update();
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
    passEncoder.setBindGroup(0, this.program.swapGroups[cur]);
    passEncoder.setBindGroup(1, this.uniformGroup);
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