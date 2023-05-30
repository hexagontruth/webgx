import { getText, join, merge } from '../util';

export default class Pipeline {
  static generateDefaults() {
    return {
      shader: 'default.wgsl',
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
    const shaderPath = join('/data/shaders', this.data.shader);
    this.shaderText = await this.program.loadShader(shaderPath);

    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.globalUniformBuffer = this.device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.customUniformBuffer = this.device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniformData = new Float32Array([
      0, // time
      0, // clock
      0, // counter
      settings.period,
      [settings.dim, settings.dim],
    ]);
    this.device.queue.writeBuffer(
      this.vertexBuffer, 0,
      this.vertexData, 0,
      this.vertexData.length
    );
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    });
    const pipelineDescriptor = {
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
            bindGroupLayout,
            this.program.alternatingGroupLayout,
          ],
      }),
    };
    this.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);
    this.bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.globalUniformBuffer }
        },
        {
          binding: 1,
          resource: this.program.samplers.linear,
        },
        {
          binding: 2,
          resource: this.program.samplers.mirror,
        },
        {
          binding: 3,
          resource: this.program.samplers.repeat,
        },
        {
          binding: 4,
          resource: this.program.streamTexture.createView(),
        }
      ],
    });
  }

  render() {
    const { device, program, settings } = this;
    const { counter, cur, next } = program;

    this.uniformData[0] = counter / settings.period;
    this.uniformData[1] = Date.now();
    this.uniformData[2] = counter;
    device.queue.writeBuffer(this.globalUniformBuffer, 0, this.uniformData);

    const commandEncoder = device.createCommandEncoder();
    const clearColor = { r: 0.2, g: 0.5, b: 1.0, a: 1.0 };
    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: 'load',
          storeOp: 'store',
          view: program.alternatingTextures[next][0].createView(),
        },
      ],
    };
    
    device.queue.writeBuffer(
      this.vertexBuffer, 0,
      this.vertexData, 0,
      this.vertexData.length
    );
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setBindGroup(1, program.alternatingGroup[cur]);
    passEncoder.draw(4);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}