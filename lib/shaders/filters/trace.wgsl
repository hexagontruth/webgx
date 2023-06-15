#include ../partials/std-header-vertex
#param scale 1.
#param mix 0.5
#param hueShift 0.1

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var samp1 = texture(inputTexture, data.uv);
  var samp2 = texture(lastTexture, scaleUv(data.uv, $scale));
  samp2 = rgb2hsv(samp2);
  samp2.x += $hueShift;
  samp2 = hsv2rgb(samp2);
  var c = mix(samp1, samp2, 0.5);
  c = clamp(c, unit.yyyy, unit.xxxx);
  return vec4f(c);
}