import { merge } from '../util';
import UniformBuffer from './uniform-buffer';
import WebgxError from './webgx-error';

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
    this.numVerts = this.vertexBuffers[0].numVerts;
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

  // No idea whether this will ever be necessary but cheap enough to include as placeholder
  createRenderPassDescriptor() {
    return {
      colorAttachments: [
        {
          clearValue: { r: 1, g: 0, b: 1, a: 1.0 },
          loadOp: 'load',
          storeOp: 'store',
          view: this.program.drawTexture.createView(),
        },
      ],
    };
  }

  createRenderPassEncoder(commandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(this.createRenderPassDescriptor());
    passEncoder.setPipeline(this.renderPipeline);
    this.vertexBuffers.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    passEncoder.setBindGroup(0, this.program.swapGroups[this.program.cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    return passEncoder;
  }

  copyInputTextures(commandEncoder, txIdx) {
    commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.inputTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
      },
    );
    commandEncoder.copyTextureToTexture(
      {
        texture: this.program.renderTextures[this.program.cur],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        texture: this.program.lastTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
  }

  copyOutputTexures(commandEncoder, txIdx) {
    commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.renderTextures[this.program.next],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
  }

  draw(txIdx, start=0, length) {
    length = length ?? this.numVerts - start;

    const commandEncoder = this.device.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.update('index', txIdx);

    const passEncoder = this.createRenderPassEncoder(commandEncoder);
    passEncoder.draw(length, 1, start);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.device.queue.submit([commandEncoder.finish()]);
  }

  drawIndexed(txIdx, start=0, length, vertexStart) {
    if (!this.program.indexData) {
      throw new WebgxError('No index data defined');
    }

    length = length ?? this.program.indexData.length - start;

    const commandEncoder = this.device.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.update('index', txIdx);

    const passEncoder = this.createRenderPassEncoder(commandEncoder);
    passEncoder.setIndexBuffer(
      this.program.indexBuffer.buffer,
      this.program.indexBuffer.type
    );
    passEncoder.drawIndexed(length, 1, start, vertexStart);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.device.queue.submit([commandEncoder.finish()]);
  }
}