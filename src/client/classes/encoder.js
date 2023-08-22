import WebgxError from './webgx-error';

export default class Encoder {
  constructor(program) {
    this.program = program;
    this.device = program.device;
    this.commandEncoder = this.device.createCommandEncoder();
    this.finished = false;
  }

  finish() {
    if (this.finished) {
      throw new WebgxError('Encoding already finished');
    }
    this.finished = true;
    return this.commandEncoder.finish();
  }

  submit() {
    this.device.queue.submit([this.finish()]);
  }

  copyBufferToBuffer(source, dest, sourceOffset=0, destOffset=0, size) {
    size = size ?? Math.min(
      source.byteLength - sourceOffset,
      dest.byteLength - destOffset
    );
    this.commandEncoder.copyBufferToBuffer(
      source.buffer,
      sourceOffset,
      dest.buffer,
      destOffset,
      size,
    );
    return this;
  }

  loadSwap(txIdx, swapIdx=this.cur) {
    const { swapDim } = this.program.settings;
    this.commandEncoder.copyTextureToTexture(
      {
        texture: this.program.swapTextures[swapIdx],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        texture: this.program.lastTexture,
      },
      {
        width: swapDim.width,
        height: swapDim.height,
        depthOrArrayLayers: 1,
      },
    );
    this.program.globalUniforms.write('index', txIdx);
    return this;
  }

  storeSwap(txIdx, swapIdx=this.next) {
    const { swapDim } = this.program.settings;
    this.commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.swapTextures[swapIdx],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        width: swapDim.width,
        height: swapDim.height,
        depthOrArrayLayers: 1,
      },
    );
    return this;
  }

  loadInput() {
    const { dim } = this.program.settings;
    this.commandEncoder.copyTextureToTexture(
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
  }

  render(txIdx, swapIdx=this.next) {
    this.commandEncoder.copyTextureToTexture(
      txIdx != null ? {
        texture: this.program.swapTextures[swapIdx],
        origin: { x: 0, y: 0, z: txIdx },
      } : {
        texture: this.program.drawTexture,
      },
      {
        texture: this.program.ctx.getCurrentTexture(),
      },
      {
        width: this.program.settings.dim.width,
        height: this.program.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
    return this;
  }

  drawSwap(pipelineName, txIdx, ...args) {
    this.loadSwap(txIdx);
    this.draw(pipelineName, ...args);
    this.storeSwap(txIdx);
  }

  drawIndexedSwap(pipelineName, txIdx, ...args) {
    this.loadSwap(txIdx);
    this.drawIndexed(pipelineName, ...args);
    this.storeSwap(txIdx);
  }

  draw(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    this.loadInput();
    pipeline.draw(this.commandEncoder, ...args);
    return this;
  }

  drawIndexed(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    this.loadInput();
    pipeline.drawIndexed(this.commandEncoder, ...args);
    return this;
  }

  compute(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.compute(this.commandEncoder, ...args);
    return this;
  }

  computeIndirect(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.computeIndirect(this.this.commandEncoder, ...args);
    return this;
  }

  get cur() {
    return this.program.cur;
  }

  get next() {
    return this.program.next;
  }
}
