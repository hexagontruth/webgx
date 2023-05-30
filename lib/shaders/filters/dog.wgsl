#include ../partials/std-header

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var c : vec4f;
  var d : vec4f;
  var samp : vec4f;
  var r : vec3f;
  var n : array<vec3f,5>;
  var v : vec2f;
  c = unit.yyyy;

  samp = texture(inputTexture, data.uv);
  var g = gaussianBlur(2, 1., data.uv);
  d = abs(samp - g);

  c = samp - d * 8.;
  // c = g;
  c = clamp(c, unit.yyyy, unit.xxxx);
  return vec4f(c.xyz, 1);
}