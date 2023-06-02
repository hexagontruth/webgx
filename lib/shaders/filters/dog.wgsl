#include ../partials/std-header
#param range 2
#param sd 1.
#param mag 8.

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var samp = texture(inputTexture, data.uv);
  var g = gaussianBlur($range, $sd, data.uv);
  var d = abs(samp - g);
  var c = samp - d * $mag;
  c = clamp(c, unit.yyyy, unit.xxxx);
  return vec4f(c);
}