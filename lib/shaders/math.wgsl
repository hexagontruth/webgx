fn roundCubic(p: vec3f) -> vec3f {
  var r = round(p);
  var d = abs(r - p);
  if (d.x > d.y && d.x > d.z) {
    r.x = -r.y - r.z;
  }
  else if (d.y > d.z) {
    r.y = -r.x - r.z;
  }
  else {
    r.z = -r.x - r.y;
  }
  return r;
}

fn cart2hex(c: vec2f) -> vec3f {
  var hex : vec3f;
  hex.y = (c.x - c.y * 1. / sr3);
  hex.z =  c.y * 2. / sr3;
  hex.x = -hex.z - hex.y;
  return hex;
}

fn hex2cart(c: vec3f) -> vec2f {
  var cart = vec2f(
    c.y + 0.5 * c.z,
    sr3 / 2. * c.z
  );
  return cart;
}

fn modf(n : vec2f, m : vec2f) -> vec2f {
  return n % m;
}

fn hexbin(bv: vec2f, s: f32) -> vec4f {
  var res = s / 3.;
  var cv : vec2f;
  var dv : vec2f;
  cv = bv;
  cv *= res;

  var r = vec2f(1., 1. / sr3);
  r = vec2f(r.y, r.x);
  var h = r * 0.5;
  
  var a = cv % r - h;
  var b = (cv - h) % r - h;

  var delta = length  (a) - length  (b);
  dv = select(b, a, delta < 0);

  a = modf(bv, r) - h;
  b = modf(bv - h, r) - h;
  var coord = select(b, a, length(a) < length(b));
  coord = (cv - dv) / res;
  dv *= 3.;
  return vec4f(dv, coord);
}

fn amax(v: vec3f) -> f32 {
  var a = abs(v);
  return max(max(a.x, a.y), a.z);
}