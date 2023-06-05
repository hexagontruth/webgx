fn texture(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, linearSampler, vec2f(uv.x, 1 - uv.y));
}

fn textureMirror(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, mirrorSampler, vec2f(uv.x, 1 - uv.y));
}

fn textureRepeat(tx : texture_2d<f32>, uv : vec2f) -> vec4f {
  return textureSample(tx, repeatSampler, vec2f(uv.x, 1 - uv.y));
}

fn renderIdx(uv : vec2f, idx : i32) -> vec4f {
  return textureSample(renderTextures, linearSampler, uv, idx);
}

fn mediaIdx(uv : vec2f, idx : i32) -> vec4f {
  return textureSample(mediaTextures, linearSampler, vec2f(uv.x, 1 - uv.y), idx);
}

fn gaussianBlur(range: i32, sd: f32, uv: vec2f) -> vec4f {
  var s : vec4f;
  var n : vec4f;
  var d : f32;
  var ds : f32;
  var i : i32;
  var j : i32;
  i = -range;
  j = -range;
  while (i <= range) {
    while (j <= range) {
      var v = vec2f(f32(i), f32(j));
      d = gaussian2(v, sd);
      ds += d;
      n = texture(inputTexture, uv + v / gu.size / 2.);
      s += n * d;
      j ++;
    }
    i ++;
  }
  s /= ds;
  return s;
}