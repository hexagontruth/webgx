import { merge } from '../util';

export default class Pipeline {
  static generateDefaults() {
    return (p) => {
      return {
        shader: 'default.wgsl',
        params: {},
        vertexData: [
          p.createVertexBuffer(4,
            new Float32Array([
              -1, -1, 0, 1,
              1, -1, 0, 1,
              -1, 1, 0, 1,
              1, 1, 0, 1,
            ]),
          ),
        ],
        customUniforms: {},
      };
    };
  }

  static async buildAll(program, defs) {
    const pipelineArray = Promise.all(
      Object.entries(defs).map(([k, v]) => Pipeline.build(program, k, v))
    );
    return Object.fromEntries((await pipelineArray).map((e) => [e.name, e]));
  }

  static async build(program, name, data) {
    const pipeline = new Pipeline(program, name, data);
    await pipeline.init();
    return pipeline;
  }

  constructor(program, name, data) {
    this.data = merge({}, Pipeline.generateDefaults()(program), data);
    this.program = program;
    this.name = name;
    this.device = program.device;
    this.settings = program.settings;
    this.vertexData = this.data.vertexData;
  }

  async init() {
    this.shaderText = await this.program.loadShader(this.data.shader, this.data.params);

    this.shaderModule = this.device.createShaderModule({
      code: this.shaderText,
    });

    this.pipelineUniforms = this.program.createUniformBuffer(this.data.uniforms);
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

    let locationIdx = 0;
    const vertexBufferLayouts = this.vertexData.map((vertexBuffer) => {
      vertexBuffer.update();
      const layout = vertexBuffer.getLayout(locationIdx);
      locationIdx += vertexBuffer.numParams;
      return layout;
    });
    this.numVerts = this.vertexData[0].numVerts;

    this.renderPipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.shaderModule,
        entryPoint: 'vertex_main',
        buffers: vertexBufferLayouts,
      },
      fragment: {
        module: this.shaderModule,
        entryPoint: 'fragment_main',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: 'triangle-strip',
        unclippedDepth: this.program.features.includes('depth-clip-control') ? true : undefined,
      },
      layout: this.device.createPipelineLayout({
          bindGroupLayouts: [
            this.program.swapGroupLayout,
            this.program.customGroupLayout,
          ],
      }),
    });
  }

  render(txIdx, startVert=0, endVert=this.numVerts) {
    const { device, program } = this;
    const { cur, next } = program;

    const commandEncoder = device.createCommandEncoder();
    const clearColor = { r: 0.2, g: 0.5, b: 1.0, a: 1.0 };
    const renderPassDescriptor = {
      colorAttachments: [
        {
          clearValue: clearColor,
          loadOp: 'load',
          storeOp: 'store',
          view: program.drawTexture.createView(),
        },
      ],
    };

    commandEncoder.copyTextureToTexture(
      {
        texture: program.drawTexture,
      },
      {
        texture: program.inputTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
      },
    );
    commandEncoder.copyTextureToTexture(
      {
        texture: program.renderTextures[cur],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        texture: program.lastTexture,
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );

    this.program.globalUniforms.set('index', txIdx);
    this.program.globalUniforms.update();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline);
    this.vertexData.forEach((vertexBuffer, idx) => {
      passEncoder.setVertexBuffer(idx, vertexBuffer.buffer);
    });
    passEncoder.setBindGroup(0, this.program.swapGroups[cur]);
    passEncoder.setBindGroup(1, this.customGroup);
    passEncoder.draw(endVert - startVert, 1, startVert);
    passEncoder.end();

    commandEncoder.copyTextureToTexture(
      {
        texture: program.drawTexture,
      },
      {
        texture: program.renderTextures[next],
        origin: { x: 0, y: 0, z: txIdx },
      },
      {
        width: this.settings.dim.width,
        height: this.settings.dim.height,
        depthOrArrayLayers: 1,
      },
    );
    device.queue.submit([commandEncoder.finish()]);
  }
}