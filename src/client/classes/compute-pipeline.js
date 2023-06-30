import { merge } from '../util';
import Pipeline from './pipeline';

export default class ComputePipeline extends Pipeline {
  static generateDefaults(p) {
    return {
      buffers: [],
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
    return passEncoder;
  }


  compute(x, y, z) {
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = this.createPassEncoder(commandEncoder);
    passEncoder.dispatchWorkgroups(x, y, z);
  }
}