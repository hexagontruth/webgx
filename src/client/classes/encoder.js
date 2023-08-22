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
  }

  draw(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.draw(this.commandEncoder, ...args);
  }

  drawIndexed(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.drawIndexed(this.commandEncoder, ...args);
  }

  compute(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.compute(this.commandEncoder, ...args);
  }

  computeIndirect(pipelineName, ...args) {
    const pipeline = this.program.getPipeline(pipelineName);
    pipeline.computeIndirect(this.this.commandEncoder, ...args);
  }

  render(txIdx) {
    this.commandEncoder.copyTextureToTexture(
      txIdx != null ? {
        // texture: this.alternatingTextures[this.next][0],
        texture: this.program.renderTextures[this.program.next],
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
  }
}
