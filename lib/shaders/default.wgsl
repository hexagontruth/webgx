#include partials/std-header-vertex

struct ProgramUniforms {
  bgColor : vec4f,
  fgColor : vec4f,
  res: f32,
  animate: f32,
  cover: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var fit = mix(1 / gu.cover.yx, gu.cover.xy, pu.cover);
  var v = data.cv * fit;
  var c : vec3f;
  var hex : vec3f;
  var a = 0.;
  var b = 0.;

  var scale = 4.;
  var res = pow(2., pu.res) / scale;
  // res = pow(2., 2. + osc1(gu.counter / gu.period / 2) * 6) / scale;
  v = v * scale;
  hex = cart2hex(v);
  var dist = interpolatedCubic(hex * res);
  hex = dist[0].xyz /res;
  v = hex2cart(hex);

  b = step(1, amax3(hex));
  a = xsum1(a, b);
  b = step(2, amax3(hex));
  a = xsum1(a, b);

  var t = select(0, gu.time, bool(pu.animate));
  for (var i = 0; i < 6; i++) {
    var u : vec2f;
    u = trot2(unit.xy * 2., f32(i) / 6.);
    hex = cart2hex(v + u);
    b = step(t, amax3(hex));
    a = xsum1(a, b);

    u = trot2(unit.xy * 2., f32(i) / 6.);
    hex = cart2hex(v + u);
    b = step(1. + t, amax3(hex));
    a = xsum1(a, b);

    u = trot2(unit.xy * 2., f32(i) / 6.);
    hex = cart2hex(v + u);
    b = step(t * 2., amax3(hex));
    a = xsum1(a, b);
  }

  var bgColor = pu.bgColor;
  var fgColor = pu.fgColor;
  // bgColor = hsv2rgb(vec4f(gu.time, 1, 1./6, 1));
  // fgColor = hsv2rgb(vec4f(gu.time + 0.5, 1, 1, 1));
  c = mix(bgColor.rgb, fgColor.rgb, a);
  var samp = texture(stream, v/scale / fit * 0.5 + 0.5);
  c = xsum3(c, samp.rgb);
  // c = rgb2hsv3(c);
  // c.x += quantize1(fract(data.uv.y - gu.time), 8);
  // c = hsv2rgb3(c);
  return vec4f(c, 1);
}