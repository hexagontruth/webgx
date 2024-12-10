import Pipeline from './pipeline';

export default class ComputePipeline extends Pipeline {
  async init() {
    await super.init();

    this.pipeline = this.device.createComputePipeline({
      compute: {
        module: this.shaderModule,
        entryPoint: this.settings.computeMain,
      },
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.program.swapGroupLayout,
          this.customGroupLayout,
          this.dataGroupLayout,
        ],
      }),
    });
  }

  createPassEncoder(commandEncoder) {
    const passEncoder = commandEncoder.beginComputePass(this.createPassDescriptor());
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.program.swapGroups[this.program.cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.setBindGroup(2, this.dataGroup);
    return passEncoder;
  }

  compute(commandEncoder, x, y, z) {
    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.dispatchWorkgroups(x, y, z);
    passEncoder.end();
  }

  // Untested lol
  computeIndirect(commandEncoder, buffer, offset=0) {
    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.dispatchWorkgroupsIndirect(buffer.buffer ?? buffer, offset);
    passEncoder.end();
  }
}
