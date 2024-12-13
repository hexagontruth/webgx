import WebgxError from './webgx-error';

const { min } = Math;

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

  copyTextureToBuffer(...args) {
    console.log(args);
    return this.commandEncoder.copyTextureToBuffer(...args);
  }

  copyBufferToBuffer(source, dest, sourceOffset=0, destOffset=0, size) {
    size = size ?? min(
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

  loadSwap(txIdx, sx=0, sy=0, dx=0, dy=0, width, height, swapIdx=this.cur) {
    const { dim, swapDim } = this.program.settings;
    width = width ?? min(swapDim.width - sx, dim.width - dx);
    height = height ?? min(swapDim.height - sy, dim.height - dy);
    this.commandEncoder.copyTextureToTexture(
      {
        texture: this.program.swapTextures[swapIdx],
        origin: { x: sx, y: sy, z: txIdx },
      },
      {
        texture: this.program.lastTexture,
        origin: { x: dx, y: dy }
      },
      {
        width,
        height,
        depthOrArrayLayers: 1,
      },
    );
    this.program.globalUniforms.write('index', txIdx);
    return this;
  }

  storeSwap(txIdx, sx=0, sy=0, dx=0, dy=0, width, height, swapIdx=this.next) {
    const { dim, swapDim } = this.program.settings;
    width = width ?? min(dim.width - sx, swapDim.width - sy);
    height = height ?? min(dim.height - dy, swapDim.height - dy);
    this.commandEncoder.copyTextureToTexture(
      {
        texture: this.program.drawTexture,
        origin: { x: sx, y: sy },
      },
      {
        texture: this.program.swapTextures[swapIdx],
        origin: { x: dx, y: dy, z: txIdx },
      },
      {
        width,
        height,
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
