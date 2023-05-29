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
    const alternatingGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
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
            alternatingGroupLayout,
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

    this.alternatingGroup = Array(2).fill().map((_, idx) => {
      return this.device.createBindGroup({
        layout: this.renderPipeline.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: this.program.outputTextures[idx].createView(),
          },
        ],
      });
    });
  }
}