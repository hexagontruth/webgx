#include structs/global-uniforms
#include structs/vertex-data
#include partials/constants
#include partials/math
#include partials/color

@group(1) @binding(0) var<uniform> gu: GlobalUniforms;

#include partials/vertex-default

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var v = data.cv / gu.cover.yx;
  var c : vec3f;
  c.r = floor((data.uv.y - gu.time) * 12)/12;
  c.r += step(1/sr3*14/12., amax3(cart2hex(v)))/2.;
  c.r += step(1/sr3*10/12., amax3(cart2hex(v)))/2.;
  c.r += step(1/sr3*6/12., amax3(cart2hex(v)))/2.;
  c.r += floor(data.uv.x * 2)/2;
  c.r += floor(data.uv.y * 2)/2;

  c.g = 0.75;
  c.b = 5./6;
  c = hsv2rgb(vec4f(c, 1)).xyz;
  return vec4f(c, 1);
}