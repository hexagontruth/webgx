import { indexMap, merge } from '../util';

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
    this.vertexData = this.data.vertexData.slice();
    
    this.program = program;
    this.name = name;
    this.device = program.device;
    this.settings = program.settings;
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
    this.globalUniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.customUniformBuffer = this.device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.globalUniformData = new Float32Array([
      0, // time
      0, // clock
      0, // counter
      settings.period,
      ...settings.cover,
      ...settings.dim,
    ]);
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
          resource: { buffer: this.globalUniformBuffer }
        },
        {
          binding: 1,
          resource: { buffer: this.customUniformBuffer },
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

    this.globalUniformData[0] = (counter / settings.period) % 1;
    this.globalUniformData[1] = Date.now();
    this.globalUniformData[2] = counter;
    device.queue.writeBuffer(this.globalUniformBuffer, 0, this.globalUniformData);

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