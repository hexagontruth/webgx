fn texture(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, samp, vec2f(uv.x, 1 - uv.y));
}