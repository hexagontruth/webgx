#include /common/partials/std-header-vertex

struct ProgramUniforms {
  scale: f32,
  resFactor: f32,
  blackLevel: f32,
  whiteLevel: f32,
  valueMultiply: f32,
  includeSolid: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;
@group(1) @binding(2) var macTexture : texture_2d<f32>;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(4, 4)
fn computeTexture(@builtin(global_invocation_id) globalIdx : vec3u) {
  var res = i32(gu.size.y);
  var idx = vec2i(globalIdx.xy);
  var u = vec2f(globalIdx.xy) / gu.size;
  var s = textureSampleLevel(stream, linearSampler, u, 0);
  s = hsv2rgb(s);
  output[idx.x + (res - 1 - idx.y) * res] = s.z;
}

@compute @workgroup_size(4, 4)
fn computeBuffer(@builtin(global_invocation_id) globalIdx : vec3u) {
  var res = i32(gu.size.y);
  var idx = vec2i(globalIdx.xy);
  var s : f32;

  for (var i = 0; i < 4; i++) {
    var u = idx.x * 2 + i % 2 + (idx.y * 2 + i / 2) * res;
    s += input[u];
  }
  s /= 4;

  output[idx.x + idx.y * res] = s;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var res = pow(2, pu.resFactor);
  var scale = pu.scale;
  var blackLevel = pu.blackLevel;
  var whiteLevel = pu.whiteLevel;

  var uv : vec2f;
  var sv : vec2f;
  var u : vec2f;
  var offset : vec2f;
  var c : vec3f;
  var b : f32;
  var range: f32;
  var s : f32;

  uv = data.uv * gu.cover;
  sv = ((uv * 2 - 1) * scale) * 0.5 + 0.5;
  u = floor(sv * res / scale) / res * scale;

  for (var i = 0; i < 9; i++) {
    var v = vec2f(vec2i(i % 3, i / 3)) * 1/3. + 1/6.;
    v = v / res * scale;
    c += texture(stream, u + v).rgb;
  }
  c /= 9;

  c = rgb2hsv3(c);
  b = c.z;

  var idx = vec2i(uv * res);
  b = input[idx.x + idx.y * i32(gu.size.y)];

  range = whiteLevel - blackLevel;
  b = (b - blackLevel) / range;
  b = clamp(b, 0, 1);
  b = select(b * 35/36., b * 37/36. - 1/36., pu.includeSolid > 0);
  // b = data.uv.y;

  offset = vec2f(
    floor((b * 36) % 6) / 6.,
    floor(b * 6) / 6.,
  );

  s = texture(macTexture, fract(uv * 64) / 6 + offset).r;
  // s = texture(macTexture, fract(uv * 1)).r;
  s = mix(s, s * b, pu.valueMultiply);

  if (pu.includeSolid > 0) {
    if (b < 0) {
      s = 0.;
    }
    else if (b >= 1) {
      s = 1;
    }
  }

  return vec4f(vec3f(s), 1);
}
