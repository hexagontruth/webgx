#include partials/std-header-vertex
#include partials/complex

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{

  var c : vec4f;
  var cv = data.cv;
  var uv = data.uv;

  // uv += csin(uv - gu.time);
  // uv = csin(uv);

  var hex = cart2hex(cv);
  // hex = sin(abs(hex) - gu.time);
  // hex = floor(hex* 10)/10.;
  var bin = hexbin(hex2cart(hex), 2.);
  c = bin;
  // return vec4f(bin.xyz, 1);
  var r = step(0.75, amax3(hex));

  var tv = uv;

  hex *= 60.;
  var dist = interpolatedCubic(hex);
  hex = dist[0].xyz /60.;
  tv = hex2cart(hex);
  tv = tv * 0.5 + 0.5;
  // tv = tv * 2 + 1;
  // tv = trot2(tv, gu.time);
  // tv = tv * 0.5 + 0.5;
  // if (uv.x > gu.time) {
  //   tv.x = abs(fract(tv.x + 0.25));
  // }
  var flurg = (floor(tv.x * 6)/6. % 2);
  tv.x = fract(tv.x + gu.time* 1. + flurg);
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

  // s = textureSample(resourceTextures, linearSampler, uv, 0);

  // s += textureIdx(uv, 0);
  s += texture(inputTexture, uv);
  // s += texture(lastTexture, uv + vec2f(sin(gu.time * tau), cos(gu.time * tau)/4.));
  s = s / 2.;

  s += mediaIdx(uv, 1);
  return s/2;

  c = rgb2hsv(c);
  c.r += floor((uv.y + gu.time) * 9.)/9. + r/2.;
  c.r += rgb2hsv(s).x;
  c.b += 1.- s.b;
  c = hsv2rgb(c);

  // c.b += 1. - smoothstep(1, 2, abs(data.position.x - 511.5));
  // c.g += 1. - smoothstep(1, 2, abs(data.position.y - 511.5));

  return vec4f(c.rgb, 1);
}