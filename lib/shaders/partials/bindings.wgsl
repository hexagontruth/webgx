@group(0) @binding(0) var linearSampler : sampler;
@group(0) @binding(1) var mirrorSampler : sampler;
@group(0) @binding(2) var repeatSampler : sampler;

@group(0) @binding(3) var lastTexture : texture_2d<f32>;
@group(0) @binding(4) var inputTexture : texture_2d<f32>;
@group(0) @binding(5) var stream : texture_2d<f32>;

@group(0) @binding(6) var mediaTextures : texture_2d_array<f32>;
@group(0) @binding(7) var renderTextures : texture_2d_array<f32>;

@group(1) @binding(0) var<uniform> gu: GlobalUniforms;