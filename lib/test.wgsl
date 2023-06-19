#include /common/structs/global-uniforms
#include /common/structs/vertex-data
#include /common/partials/constants
#include /common/partials/math
#include /common/partials/color

@group(0) @binding(0) var<uniform> gu: GlobalUniforms;

#include /common/partials/vertex-default

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  var v = data.cv / gu.cover.yx;
  var c : vec3f;
  var rad = amax3(c2h * v);
  c.x = floor((data.uv.y - gu.time) * 12)/12;
  c.x += step(14/16., rad)/2.;
  c.x += step(10/16., rad)/2.;
  c.x += step(6/16., rad)/2.;
  c.x += floor(data.uv.x * 2)/2;
  c.x += floor(data.uv.y * 2)/2;

  c.y = 0.75;
  c.z = 5./6;
  c = hsv2rgb(vec4f(c, 1)).xyz;
  return vec4f(c, 1);
}