#include /common/partials/std-header-vertex

struct ProgramUniforms {
  scale: f32,
  resolution: f32,
  blackLevel: f32,
  whiteLevel: f32,
  valueMultiply: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;
@group(1) @binding(2) var macTexture : texture_2d<f32>;

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var resolution = pu.resolution;
  var scale = pu.scale;
  var blackLevel = pu.blackLevel;
  var whiteLevel = pu.whiteLevel;

  var uv = data.uv * gu.cover;
  var sv = ((uv * 2 - 1) * scale) * 0.5 + 0.5;
  var u = floor(sv * resolution / scale) / resolution * scale;
  var c : vec3f;

  for (var i = 0; i < 9; i++) {
    var v = vec2f(vec2i(i % 3, i / 3)) * 1/3. + 1/6.;
    v = v / resolution * scale;
    c += texture(stream, u + v).rgb;
  }
  c /= 9;
  // var b = sum3(c)/3.;
  c = rgb2hsv3(c);
  var b = c.z;
  var range = whiteLevel - blackLevel;
  b = (b - blackLevel) / range;
  b = clamp(b, 0, 35/36.);
  // b = data.uv.y;
  var offset = vec2f(
    floor((b * 36) % 6) / 6.,
    floor(b * 6) / 6.,
  );

  var s = texture(macTexture, fract(uv * 90) / 6 + offset).r;
  // s = texture(macTexture, fract(uv * 1)).r;
  s = mix(s, s * b, pu.valueMultiply);
  return vec4f(vec3f(s), 1);
}
