fn testPattern(uv: vec2f) -> vec4f {
  var v = (uv * 2 - 1) / gu.cover.yx;
  var c : vec3f;
  var rad = amax3(cart2hex * v);
  c.x = floor((v.y * 0.5 + 0.5 - gu.time) * 12)/12;
  c.x += step(14/16., rad)/2.;
  c.x += step(10/16., rad)/2.;
  c.x += step(6/16., rad)/2.;
  c.x += floor(uv.x * 2)/2;
  c.x += floor(uv.y * 2)/2;

  c.y = 0.75;
  c.z = 5./6;
  c = hsv2rgb(vec4f(c, 1)).xyz;
  return vec4f(c, 1);
}
