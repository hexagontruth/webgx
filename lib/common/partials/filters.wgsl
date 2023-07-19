fn gaussianBlur(range: i32, sd: f32, uv: vec2f) -> vec4f {
  var s : vec4f;
  var n : vec4f;
  var d : f32;
  var ds : f32;
  for (var i = -range; i <= range; i++) {
    for (var j = -range; j <= range; j++) {
      var v = vec2f(f32(i), f32(j));
      d = gaussian2(v, sd);
      ds += d;
      n = texture(inputTexture, uv + v / gu.size);
      s += n * d;
    }
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

fn dogFilter(uv: vec2f, sd: f32, range: i32, magnitude: f32) -> vec4f {
  var samp = texture(inputTexture, uv);
  var g = gaussianBlur(range, sd, uv);
  var d = abs(samp - g);
  var c = samp - d * magnitude;
  c = clamp(c, unit.yyyy, unit.xxxx);
  return vec4f(c);
}
