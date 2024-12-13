#include /common/partials/std-header-vertex

struct ProgramUniforms {
  scale: f32,
  resFactor: f32,
  blackLevel: f32,
  whiteLevel: f32,
  includeSolidRange: f32,
  color: f32,
  test: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;
@group(1) @binding(2) var macTexture : texture_2d<f32>;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

fn readBuffer(idx: i32) -> vec4f {
  return vec4f(
    input[idx * 4],
    input[idx * 4 + 1],
    input[idx * 4 + 2],
    input[idx * 4 + 3],
  );
}

fn writeBuffer(idx: i32, s: vec4f) {
  output[idx * 4] = s.x;
  output[idx * 4 + 1] = s.y;
  output[idx * 4 + 2] = s.z;
  output[idx * 4 + 3] = s.w;
}

fn samplePattern(uv: vec2f, v: f32) -> f32 {
  var patternRes = gu.size.y / 8;
  var offset = vec2f(
    floor((v * 36) % 6) / 6.,
    floor(v * 6) / 6.,
  );
  return texture(macTexture, fract(uv * patternRes) / 6 + offset).r;
}

@compute @workgroup_size(4, 4)
fn computeTexture(@builtin(global_invocation_id) globalIdx : vec3u) {
  var res = i32(gu.size.y);
  var idx = vec2i(globalIdx.xy);
  var u = vec2f(globalIdx.xy) / gu.size;
  u = (u * 2 - 1) * pu.scale * 0.5 + 0.5;
  var s = textureSampleLevel(stream, linearSampler, u, 0);
  // s = hsv2rgb(s);
  writeBuffer(idx.x + (res - 1 - idx.y) * res, s);
}

@compute @workgroup_size(4, 4)
fn computeBuffer(@builtin(global_invocation_id) globalIdx : vec3u) {
  var res = i32(gu.size.y);
  var idx = vec2i(globalIdx.xy);
  var s : vec4f;

  for (var i = 0; i < 4; i++) {
    var u = idx.x * 2 + i % 2 + (idx.y * 2 + i / 2) * res;
    s += readBuffer(u);
  }
  s /= 4;

  writeBuffer(idx.x + idx.y * res, s);
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var resolution = pow(2, pu.resFactor);
  var blackLevel = pu.blackLevel;
  var whiteLevel = pu.whiteLevel;

  var c : vec3f;

  var uv = data.uv * gu.cover;
  var idx = vec2i(uv * resolution);
  var s = readBuffer(idx.x + idx.y * i32(gu.size.y)).rgb;

  var range = whiteLevel - blackLevel;
  s = (s - blackLevel) / range;
  s = clamp(s, uf.yyy, uf.xxx);
  s = select(s * 35/36., s * 37/36. - 1/36., pu.includeSolidRange > 0);

  if (pu.test > 0) {
    c = s;
  }
  else if (pu.color > 0) {
    for (var i = 0; i < 3; i++) {
      c[i] = samplePattern(uv, s[i]);
    }
  } else {
    s = rgb2hsv3(s).zzz;
    c = uf.xxx * samplePattern(uv, s.x);
  }

  c = select(c, uf.yyy, s < uf.yyy);
  c = select(c, uf.xxx, s >= uf.xxx);

  return vec4f(c, 1);
}
