#include /common/partials/std-header-vertex

// @group(0) @binding(0) var<uniform> gu: GlobalUniforms;
@group(1) @binding(2) var macTexture : texture_2d<f32>;

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var v = (data.uv * 2 - 1) / gu.cover.yx;
  var c : vec3f;
  var rad = amax3(cart2hex * v);
  c.x = floor((v.y * 0.5 + 0.5 - gu.time) * 12)/12;
  c.x += step(14/16., rad)/2.;
  c.x += step(10/16., rad)/2.;
  c.x += step(6/16., rad)/2.;
  c.x += floor(data.uv.x * 2)/2;
  c.x += floor(data.uv.y * 2)/2;

  c.y = 0.75;
  c.z = 5./6;
  c = hsv2rgb(vec4f(c, 1)).xyz;
  c.r = texture(macTexture, data.uv).r;
  return vec4f(c, 1);
}
