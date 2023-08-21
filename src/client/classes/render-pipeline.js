import Pipeline from './pipeline';

export default class RenderPipeline extends Pipeline {
  static generateDefaults() {
    return {
      vertexBuffers: [],
      numVerts: null,
    };
  }

  async init() {
    await super.init();
    this.vertexBuffers = this.settings.vertexBuffers;
    this.numVerts =
      this.vertexBuffers[0]?.numVerts ||
      this.settings.numVerts ||
      this.program.settings.defaultNumVerts;

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
      layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            this.program.swapGroupLayout,
            this.program.customGroupLayout,
            this.dataGroupLayout,
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
    passEncoder.setBindGroup(0, this.program.swapGroups[this.program.cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.setBindGroup(2, this.dataGroup);
    this.vertexBuffers.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    return passEncoder;
  }

  draw(vertCount, instCount, vertStart, instStart, txIdx) {
    // Allow defaults with nulls
    instCount = instCount ?? 1;
    vertStart = vertStart ?? 0;
    instStart = instStart ?? 0;
    vertCount = vertCount ?? this.numVerts - vertStart;
    txIdx = txIdx ?? 0;

    const commandEncoder = this.program.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.write('index', txIdx);

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.draw(vertCount, instCount, vertStart, instStart);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.program.submitCommandEncoder(commandEncoder);
  }

  drawIndexed(idxData, idxCount, instCount, idxStart, baseVert, instStart, txIdx) {
    instCount = instCount ?? 1
    idxStart = idxStart ?? 0;
    baseVert = baseVert ?? 0;
    instStart = instStart ?? 0;
    idxCount = idxCount ?? idxData.length - idxStart
    txIdx = txIdx ?? 0;

    const commandEncoder = this.program.createCommandEncoder();
    this.copyInputTextures(commandEncoder, txIdx);
    this.program.globalUniforms.write('index', txIdx);

    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.setIndexBuffer(
      idxData.buffer,
      idxData.type
    );
    passEncoder.drawIndexed(idxCount, instCount, idxStart, baseVert, instStart);
    passEncoder.end();

    this.copyOutputTexures(commandEncoder, txIdx);

    this.program.submitCommandEncoder(commandEncoder);
  }
}
