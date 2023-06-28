fn texture(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, linearSampler, vec2f(uv.x, 1 - uv.y));
}

fn textureMirror(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, mirrorSampler, vec2f(uv.x, 1 - uv.y));
}

fn textureRepeat(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, repeatSampler, vec2f(uv.x, 1 - uv.y));
}

fn renderTextureIdx(uv : vec2f, idx : i32) -> vec4f {
  return textureSample(renderTextures, linearSampler, uv, idx);
}

fn mediaTextureIdx(uv : vec2f, idx : i32) -> vec4f {
  return textureSample(mediaTextures, linearSampler, vec2f(uv.x, 1 - uv.y), idx);
}