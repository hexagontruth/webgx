import { merge } from '../util';
import UniformBuffer from './uniform-buffer';

export default class Pipeline {
  static generateDefaults(p) {
    return {
      vertexMain: 'vertexMain',
      fragmentMain: 'fragmentMain',
      computeMain: 'computeMain',
      topology: null,
      dataBuffers: [],
      uniforms: {},
      params: {},
    };
  }

  constructor(program, shaderPath, settings={}) {
    this.program = program;
    this.shaderPath = shaderPath;
    this.settings = merge(
      {},
      Pipeline.generateDefaults(program),
      this.constructor.generateDefaults(program),
      settings,
    );
  }

  async init() {
    this.device = this.program.device;
    this.shaderText = await this.program.loadShader(
      this.program.programDir, this.shaderPath
    );

    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });

    this.pipelineUniforms = new UniformBuffer(this.device, this.settings.uniforms);
    this.pipelineUniforms.write();

    this.customGroup = this.program.createBindGroup(
      this.program.customGroupLayout,
      [
        { buffer: this.program.programUniforms.buffer },
        { buffer: this.pipelineUniforms.buffer },
      ],
    );

    this.dataBuffers = this.settings.dataBuffers.map((idx) => this.program.dataBuffers[idx]);

    this.dataGroupLayout = this.program.createBindGroupLayout(
      this.dataBuffers.map((e) => e.getLayout()),
      GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
    );

    this.dataGroup = this.program.createBindGroup(
      this.dataGroupLayout,
      this.dataBuffers,
    );
  }

  createPassDescriptor() {
    return {
      // TBD
    };
  }
}
