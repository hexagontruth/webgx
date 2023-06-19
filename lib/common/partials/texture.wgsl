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
      n = texture(inputTexture, uv + v / gu.size);
      s += n * d;
      j++;
    }
    i++;
  }
  s /= ds;
  return s;
}

fn medianFilter(uv: vec2f) -> vec4f {
  var s : array<vec4f,9>;
  for (var i = 0; i < 9; i++) {
    var x = f32(i) % 3;
    var y = floor(f32(i) / 3);
    var v = vec2f(x, y) - unit.xy;
    var t = texture(inputTexture, uv + v / gu.size);
    for (var j = 0; j < 4; j++) {
      var tj = t[j];
      var idx = 0;
      while (idx < i) {
        if (tj < s[idx][j]) {
          break;
        }
        idx++;
      }
      var k = i;
      while (k > idx) {
        s[k][j] = s[k - 1][j];
        k--;
      }
      s[idx][j] = tj;
    }
  }
  return s[4];
}