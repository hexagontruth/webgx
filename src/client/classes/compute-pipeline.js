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
          this.program.customGroupLayout,
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

  compute(x, y, z) {
    const commandEncoder = this.program.createCommandEncoder();
    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.dispatchWorkgroups(x, y, z);
    passEncoder.end();
    this.program.submitCommandEncoder(commandEncoder);
  }
}