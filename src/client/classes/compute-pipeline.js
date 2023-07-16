import { merge } from '../util';
import Pipeline from './pipeline';

export default class ComputePipeline extends Pipeline {
  static generateDefaults(p) {
    return {
      dataBuffers: [],
    };
  }

  constructor(program, shaderPath, settings) {
    super(program, shaderPath, settings);
    this.settings = merge(
      {},
      Pipeline.generateDefaults(program),
      ComputePipeline.generateDefaults(program),
      settings,
    );
  }

  async init() {
    await super.init();
    this.dataBuffers = this.settings.dataBuffers.map((idx) => this.program.dataBuffers[idx]);

    this.dataGroupLayout = this.program.createBindGroupLayout(
      GPUShaderStage.COMPUTE,
      Array(this.dataBuffers.length).fill({ buffer: { type: 'storage' } }),
    );

    this.dataGroup = this.program.createBindGroup(
      this.dataGroupLayout,
      this.dataBuffers,
    );

    this.pipeline = this.device.createComputePipeline({
      compute: {
        module: this.shaderModule,
        entryPoint: this.settings.computeMain,
      },
      layout: 'auto',
    });
  }

  createPassDescriptor() {
    return {
      // TBD
    };
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
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.dispatchWorkgroups(x, y, z);
  }
}