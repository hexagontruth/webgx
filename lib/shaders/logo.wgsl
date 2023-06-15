#include partials/std-header-vertex

struct ProgramUniforms {
  bgColor : vec4f,
  fgColor : vec4f,
  res: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var v = data.cv / gu.cover.yx;
  var c : vec3f;
  var hex : vec3f;
  var a = 0.;
  var b = 0.;

  var scale = 4.;
  var res = pu.res / scale;
  v = v * scale;
  hex = cart2hex(v);
  var dist = interpolatedCubic(hex * res);
  hex = dist[0].xyz /res;
  v = hex2cart(hex);

  b = step(1, amax3(hex));
  a = xsum1(a, b);
  b = step(2, amax3(hex));
  a = xsum1(a, b);

  for (var i = 0; i < 6; i++) {
    var u : vec2f;
    for (var j = 0; j < 7; j++) {
      u = trot2(unit.xy * (f32(j) * 2. + 2. * gu.time), f32(i) / 6.);
      hex = cart2hex(v + u);
      b = step(f32(j) + gu.time, amax3(hex));
      a = xsum1(a, b);
    }
  }

  c = mix(pu.bgColor.rgb, pu.fgColor.rgb, a);
  var samp = texture(stream, v/scale * gu.cover.yx * 0.5 + 0.5);
  c = xsum3(c, samp.rgb);
  return vec4f(c, 1);
}