import UniformBuffer from "./uniform-buffer";

export default class Pipeline {
  static generateDefaults(p) {
    return {
      shader: 'default.wgsl',
      vertexMain: 'vertexMain',
      fragmentMain: 'fragmentMain',
      computeMain: 'computeMain',
      topology: 'triangle-strip',
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

    this.customGroup = this.device.createBindGroup({
      layout: this.program.customGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.program.programUniforms.buffer },
        },
        {
          binding: 1,
          resource: { buffer: this.pipelineUniforms.buffer },
        }
      ],
    });
  }
}