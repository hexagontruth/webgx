import { getText, merge } from '../util';

export default class Pipeline {
  static async buildAll(program, defs) {
    return Promise.all(
      Object.entries(defs).map(([k, v]) => Pipeline.build(program, k, v))
    );
  }

  static async build(program, name, data) {
    const pipeline = new Pipeline(program, name, data);
    await pipeline.init();
    return pipeline;
  }

  constructor(program, name, data) {
    this.data = data;
    merge(this, data);
    this.program = program;
    this.name = name;
    this.device = program.device;
    this.settings = program.settings;
  }

  async init() {
    const { settings } = this;

    this.shaderText = await this.program.loadShader(this.shader);
    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.uniformBuffer = this.device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uniformData = new Float32Array([
      0, // time
      0, // clock
      0, // counter
      this.settings.period,
      [this.settings.dim, this.settings.dim],
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
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
    const pipelineDescriptor = {
      vertex: {
        module: this.shaderModule,
        entryPoint: 'vertex_main',
        buffers: this.vertexBuffers,
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
          ],
      }),
    };
    this.renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
    this.bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer }
        },
        {
          binding: 1,
          resource: this.program.streamTexture.createView(),
        },
        {
          binding: 2,
          resource: this.sampler,
        },
      ],
    });
  }
}