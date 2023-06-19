import { merge } from '../util';
import UniformBuffer from './uniform-buffer';

export default class Pipeline {
  static generateDefaults(p) {
    return {
      shader: 'default.wgsl',
      vertexMain: 'vertexMain',
      fragmentMain: 'fragmentMain',
      topology: 'triangle-strip',
      vertexSets: [0],
      customUniforms: {},
      params: {},
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
    this.data = merge({}, Pipeline.generateDefaults(program), data);
    this.program = program;
    this.name = name;
    this.device = program.device;
    this.settings = program.settings;
    this.vertexBuffers = this.data.vertexSets.map((idx) => this.program.vertexBuffers[idx]);
    this.numVerts = this.vertexBuffers[0].set.numVerts;
  }

  async init() {
    this.shaderText = await this.program.loadShader(
      this.program.programDir, this.data.shader, this.data.params
    );

    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });

    this.pipelineUniforms = new UniformBuffer(this.device, this.data.uniforms);
    this.pipelineUniforms.update();

    this.customGroup = this.device.createBindGroup({
      layout: this.program.customGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.program.programUniforms.buffer },
        },
        {
          binding: 1,
          resource: { buffer: this.pipelineUniforms.buffer },
        }
      ],
    });

    let locationIdx = 0;
    const vertexBufferLayouts = this.vertexBuffers.map((vertexBuffer) => {
      vertexBuffer.update();
      const layout = vertexBuffer.getLayout(locationIdx);
      locationIdx += vertexBuffer.numParams;
      return layout;
    });

    this.renderPipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: this.data.vertexMain,
        buffers: vertexBufferLayouts,
      },
      fragment: {
        module: this.shaderModule,
        entryPoint: this.data.fragmentMain,
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: this.data.topology,
        unclippedDepth: this.program.features.includes('depth-clip-control') ? true : undefined,
      },
      layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            this.program.swapGroupLayout,
            this.program.customGroupLayout,
          ],
      }),
    });
  }

  render(txIdx, start=0, length) {
    length = length ?? this.numVerts - start;

    const { device, program } = this;
    const { cur, next } = program;

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

    this.program.globalUniforms.set('index', txIdx);
    this.program.globalUniforms.update('index');

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline);
    this.vertexBuffers.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    passEncoder.setBindGroup(0, this.program.swapGroups[cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.draw(length, 1, start);
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