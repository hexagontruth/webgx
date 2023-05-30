@group(0) @binding(0) var<uniform> gu: GlobalUniforms;

@group(0) @binding(1) var linearSampler : sampler;
@group(0) @binding(2) var mirrorSampler : sampler;
@group(0) @binding(3) var repeatSampler : sampler;

@group(0) @binding(4) var stream : texture_2d<f32>;

@group(1) @binding(0) var arrayTextures : texture_2d_array<f32>;
@group(1) @binding(1) var lastTexture : texture_2d<f32>;
@group(1) @binding(2) var inputTexture : texture_2d<f32>;