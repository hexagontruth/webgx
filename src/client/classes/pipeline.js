import UniformBuffer from "./uniform-buffer";

export default class Pipeline {
  static generateDefaults(p) {
    return {
      vertexMain: 'vertexMain',
      fragmentMain: 'fragmentMain',
      computeMain: 'computeMain',
      topology: null,
      uniforms: {},
      params: {},
    };
  }

  constructor(program, shaderPath, settings={}) {
    this.program = program;
    this.shaderPath = shaderPath;
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
    this.pipelineUniforms.update();

    this.customGroup = this.program.createBindGroup(
      this.program.customGroupLayout,
      [
        { buffer: this.program.programUniforms.buffer },
        { buffer: this.pipelineUniforms.buffer },
      ],
    );
  }
}