#include /common/partials/std-header
#include /common/partials/filters
#include /common/partials/test

struct CustomVertexData {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) cv : vec2f,
  @location(2) color: vec3f,
};

struct ProgramUniforms {
  opacity: f32,
  invert: f32,
  background: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) color: vec3f) -> CustomVertexData
{
  var output : CustomVertexData;
  output.position = vec4f(position, 0, 1);
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  output.color = color;
  return output;
}

@vertex
fn fullVertexMain(@location(0) position: vec2f) -> VertexData
{
  var output : VertexData;
  output.position = vec4f(position, 0, 1);
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  return output;
}

@fragment
fn fragmentMain(data: CustomVertexData) -> @location(0) vec4f {
  var s = testPattern(data.uv).rgb;
  var color = hsv2rgb3(data.color);
  var c = mix(
    mix(s, color, pu.opacity),
    xsum3(s, color * pu.opacity),
    pu.invert,
  );

  return vec4f(c, 1);
}

@fragment
fn dogFilterMain(data: VertexData) -> @location(0) vec4f {
  return dogFilter(data.uv, 2., 4, 8.);
}

@fragment
fn testMain(data: VertexData) -> @location(0) vec4f {
  return testPattern(data.uv);
}