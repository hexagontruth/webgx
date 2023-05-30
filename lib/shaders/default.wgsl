#include partials/std-header

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
  c = bin;
  // return vec4f(bin.xyz, 1);
  var r = step(0.75, amax3(hex));

  var tv = uv;
  // if (uv.x > gu.time) {
  //   tv.x = abs(fract(tv.x + 0.25));
  // }
  var flurg = (floor(tv.x * 6)/6. % 2);
  tv.x = fract(tv.x + gu.time* 0.5 + flurg);
  // tv.y = mix(tv.y, 1.-tv.y, flurg);
  var s = texture(stream, scaleUv(tv, 1.5));
  var t = textureRepeat(stream, scaleUv(tv, 1.5));
  var u = textureMirror(stream, scaleUv(tv, 1.5));
  if (uv.y > 2./3) {
    s = t;
  }
  if (uv.y < 1./3) {
    s = u;
  }

  // s += textureIdx(uv, 0);
  s += texture(inputTexture, uv);
  // s += texture(lastTexture, uv + vec2f(sin(gu.time * tau), cos(gu.time * tau)/4.));
  s = s / 2.;
  return s;

  c = rgb2hsv(c);
  c.r += floor((uv.y + gu.time) * 9.)/9. + r/2.;
  c.r += rgb2hsv(s).x;
  c.b += 1.- s.b;
  c = hsv2rgb(c);
  // c.b += 1. - smoothstep(1, 2, abs(data.position.x - 511.5));
  // c.g += 1. - smoothstep(1, 2, abs(data.position.y - 511.5));

  return vec4f(c.rgb, 1);
}