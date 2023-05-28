#include constants
#include math
#include color
#include structs/global-uniforms
#include structs/cursor-uniforms

struct VertexData {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) cv : vec2f,
};

@vertex
fn vertex_main(@location(0) position: vec4f) -> VertexData
{
  var output : VertexData;
  output.position = position;
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  return output;
}

@group(0) @binding(0) var<uniform> gu: GlobalUniforms;

@group(0) @binding(1) var samp : sampler;

@group(0) @binding(2) var stream : texture_2d<f32>;

@group(1) @binding(0) var last : texture_2d<f32>;

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{

  var c : vec4f;
  var cv = data.cv;
  var uv = data.uv;

  var hex = cart2hex(cv);
  // hex = sin(abs(hex) - gu.time);
  // hex = floor(hex* 10)/10.;
  var bin = hexbin(hex2cart(hex), 2.);
  bin = bin + textureSample(last, samp, (cv.yx * 2) * 0.5 + 0.5);
  bin /= 2.;
  c = bin;
  // return vec4f(bin.xyz, 1);
  var r = step(0.75, amax3(hex));

  var s = textureSample(stream, samp, uv);

  c = rgb2hsv(c);
  c.r += floor((uv.y + gu.time) * 9.)/9. + r/2.;
  c.r += rgb2hsv(s).x;
  c.b += 1.- s.b;
  c = hsv2rgb(c);
  // c.b += 1. - smoothstep(1, 2, abs(data.position.x - 511.5));
  // c.g += 1. - smoothstep(1, 2, abs(data.position.y - 511.5));

  return vec4f(c.rgb, 1);
}