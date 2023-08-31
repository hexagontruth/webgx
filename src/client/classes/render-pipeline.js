import Pipeline from './pipeline';

export default class RenderPipeline extends Pipeline {
  static generateDefaults() {
    return {
      vertexBuffers: [],
      numVerts: null,
      depthTest: null,
    };
  }

  async init() {
    await super.init();
    this.vertexBuffers = this.settings.vertexBuffers;
    this.settings.numVerts =
      this.vertexBuffers[0]?.numVerts ||
      this.settings.numVerts ||
      this.program.settings.defaultNumVerts;
    this.settings.depthTest = this.settings.depthTest || this.program.settings.defaultDepthTest;

    let locationIdx = 0;
    const vertexBufferLayouts = this.vertexBuffers.map((vertexBuffer) => {
      const layout = vertexBuffer.getVertexLayout(locationIdx);
      locationIdx += vertexBuffer.numParams;
      return layout;
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: this.settings.vertexMain,
        buffers: vertexBufferLayouts.length ? vertexBufferLayouts : undefined,
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
      depthStencil: this.settings.depthTest? {
        depthWriteEnabled: true,
        depthCompare: 'less-equal',
        format: 'depth24plus',
       } : undefined,
      layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            this.program.swapGroupLayout,
            this.program.customGroupLayout,
            this.dataGroupLayout,
          ],
      }),
    });
  }

  createPassDescriptor() {
    const descriptor = {
      colorAttachments: [
        {
          clearValue: { r: 1, g: 0, b: 1, a: 1.0 },
          loadOp: 'load',
          storeOp: 'store',
          view: this.program.drawTexture.createView(),
        },
      ],
    };
    if (this.settings.depthTest) {
      descriptor.depthStencilAttachment = {
        view: this.program.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      };
    }
    return descriptor;
  }

  createPassEncoder(commandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(this.createPassDescriptor());
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.program.swapGroups[this.program.cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.setBindGroup(2, this.dataGroup);
    this.vertexBuffers.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    return passEncoder;
  }

  draw(commandEncoder, vertCount, instCount=1, vertStart=0, instStart=0) {
    vertCount = vertCount ?? this.settings.numVerts - vertStart;

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.draw(vertCount, instCount, vertStart, instStart);
    passEncoder.end();
  }

  drawIndexed(
    commandEncoder,
    idxBuffer,
    idxCount,
    instCount=1,
    idxStart=0,
    baseVert=0,
    instStart=0
  ) {
    idxCount = idxCount ?? idxBuffer.length - idxStart

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.setIndexBuffer(
      idxBuffer.buffer,
      idxBuffer.type
    );
    passEncoder.drawIndexed(idxCount, instCount, idxStart, baseVert, instStart);
    passEncoder.end();
  }
}
