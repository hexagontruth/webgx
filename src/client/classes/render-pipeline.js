import { merge } from '../util';
import Pipeline from './pipeline';

export default class RenderPipeline extends Pipeline {
  static generateDefaults(p) {
    return {
      vertexBuffers: [0],
    };
  }

  constructor(program, shaderPath, settings) {
    super(program, shaderPath, settings);
    this.settings = merge(
      {},
      Pipeline.generateDefaults(program),
      RenderPipeline.generateDefaults(program),
      settings,
    );
  }

  async init() {
    await super.init();
    this.vertexBuffers = this.settings.vertexBuffers.map((idx) => this.program.dataBuffers[idx]);
    this.numVerts = this.vertexBuffers[0].numVerts;

    let locationIdx = 0;
    const vertexBufferLayouts = this.vertexBuffers.map((vertexBuffer) => {
      vertexBuffer.update();
      const layout = vertexBuffer.getLayout(locationIdx);
      locationIdx += vertexBuffer.numParams;
      return layout;
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: this.settings.vertexMain,
        buffers: vertexBufferLayouts,
      },
      fragment: {
        module: this.shaderModule,
        entryPoint: this.settings.fragmentMain,
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: this.settings.topology ?? this.program.settings.topology,
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

  copyInputTextures(commandEncoder, txIdx) {
    const { dim } = this.program.settings;
    commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.inputTexture,
      },
      {
        width: dim.width,
        height: dim.height,
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
        width: dim.width,
        height: dim.height,
        depthOrArrayLayers: 1,
      },
    );
  }

  copyOutputTexures(commandEncoder, txIdx) {
    const { dim } = this.program.settings;
    commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.renderTextures[this.program.next],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        width: dim.width,
        height: dim.height,
        depthOrArrayLayers: 1,
      },
    );
  }

  createPassDescriptor() {
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

  createPassEncoder(commandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(this.createPassDescriptor());
    passEncoder.setPipeline(this.pipeline);
    this.vertexBuffers.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    passEncoder.setBindGroup(0, this.program.swapGroups[this.program.cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    return passEncoder;
  }

  draw(txIdx=0, start=0, length) {
    length = length ?? this.numVerts - start;

    const commandEncoder = this.device.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.update('index', txIdx);

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.draw(length, 1, start);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.device.queue.submit([commandEncoder.finish()]);
  }

  drawIndexed(bufferIdx, txIdx=0, start=0, length, vertexStart) {
    const indexData = this.program.dataBuffers[bufferIdx];
    length = length ?? indexData.length - start;

    const commandEncoder = this.device.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.update('index', txIdx);

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.setIndexBuffer(
      indexData.buffer,
      indexData.type
    );
    passEncoder.drawIndexed(length, 1, start, vertexStart);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.device.queue.submit([commandEncoder.finish()]);
  }
}