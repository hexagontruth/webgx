import { merge } from '../util';
import UniformBuffer from './uniform-buffer';

export default class Pipeline {
  static generateDefaults() {
    return {
      vertexMain: 'vertexMain',
      fragmentMain: 'fragmentMain',
      computeMain: 'computeMain',
      topology: null,
      dataBuffers: [],
      uniforms: {},
      params: {},
      bufferVisibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
    };
  }

  constructor(program, shaderPath, settings={}) {
    this.program = program;
    this.shaderPath = shaderPath;
    this.settings = merge(
      {},
      Pipeline.generateDefaults(),
      this.constructor.generateDefaults(),
      settings,
    );
  }

  async init() {
    this.device = this.program.device;
    this.shaderText = await this.program.loadShader(
      this.program.programDir, this.shaderPath, this.settings.params,
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

    this.dataBuffers = this.settings.dataBuffers;

    this.dataGroupLayout = this.program.createBindGroupLayout(
      this.dataBuffers.map((e) => e.getLayout()),
      this.settings.bufferVisibility,
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
