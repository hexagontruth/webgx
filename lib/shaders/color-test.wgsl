#include partials/std-header

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var c : vec3f;
  c.r = floor((data.uv.y - gu.time) * 10)/10;
  c.r += step(1/sr3*6/10., amax3(cart2hex(data.cv)))/2.;
  c.r += step(1/sr3*8/10., amax3(cart2hex(data.cv)))/2.;
  c.r += step(1/sr3*4/10., amax3(cart2hex(data.cv)))/2.;
  c.g = 0.75;
  c.b = 5./6;
  c = hsv2rgb(vec4f(c, 1)).xyz;
  return vec4f(c, 1);
}