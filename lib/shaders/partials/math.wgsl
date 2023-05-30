fn scaleUv(uv : vec2f, s : f32) -> vec2f {
  return (uv * 2 - 1) * s * 0.5 + 0.5;
}
  
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

fn hexbin(base : vec2f, s : f32) -> vec4f {
  var res = s / 3.;
  var cv : vec2f;
  var dv : vec2f;
  cv = base;
  cv *= res;

  var r = vec2f(1., 1. / sr3);
  r = vec2f(r.y, r.x);
  var h = r * 0.5;
  
  var a = m2(cv, r) - h;
  var b = m2(cv - h, r) - h;

  var delta = length(a) - length(b);
  // dv = delta < 0. ? a : b;
  dv = select(b, a, delta < 0.);

  a = m2(base, r) - h;
  b = m2(base - h, r) - h;
  var coord : vec2f;
  // coord = length(a) < length(b) ? a : b;
  coord = select(b, a, length(a) < length(b));
  coord = (cv - dv) / res;
  dv *= 3.;
  return vec4f(dv, coord);
}

// fn hexbin(bv: vec2f, s: f32) -> vec4f {
//   var res = s / 3.;
//   var cv : vec2f;
//   var dv : vec2f;
//   cv = bv;
//   cv *= res;

//   var r = vec2f(1., 1. / sr3);
//   r = vec2f(r.y, r.x);
//   var h = r * 0.5;
  
//   var a = (cv % r) - h;
//   var b = ((cv - h) % r) - h;

//   var delta = length(a) - length(b);
//   dv = select(b, a, delta < 0);

//   a = modf(bv, r) - h;
//   b = modf(bv - h, r) - h;
//   var coord = select(b, a, length(a) < length(b));
//   coord = (cv - dv) / res;
//   dv *= 3.;
//   return vec4f(dv, coord);
// }

fn amax2(v: vec2f) -> f32 {
  var a = abs(v);
  return max(a.x, a.y);
}

fn amax3(v: vec3f) -> f32 {
  var a = abs(v);
  return max(max(a.x, a.y), a.z);
}

fn amax4(v: vec4f) -> f32 {
  var a = abs(v);
  return max(max(max(a.x, a.y), a.z), a.w);
}

fn m1(n: f32, m: f32) -> f32 {
  return fract(n / m) * m;
}

fn m2(n: vec2f, m: vec2f) -> vec2f {
  return fract(n / m) * m;
}

fn m3(n: vec3f, m: vec3f) -> vec3f {
  return fract(n / m) * m;
}

fn m4(n: vec4f, m: vec4f) -> vec4f {
  return fract(n / m) * m;
}

fn gaussian2(v: vec2f, sd: f32) -> f32 {
  return 1./(tau * sd * sd) * exp(-(v.x * v.x + v.y * v.y) / (2. * sd * sd));
}

fn gaussianBlur(range: i32, sd: f32, uv: vec2f) -> vec4f {
  var s : vec4f;
  var n : vec4f;
  var d : f32;
  var ds : f32;
  var i : i32;
  var j : i32;
  i = -range;
  j = -range;
  while (i <= range) {
    while (j <= range) {
      var v = vec2f(f32(i), f32(j));
      d = gaussian2(v, sd);
      ds += d;
      n = texture(inputTexture, uv + v / gu.size / 2.);
      s += n * d;
      j ++;
    }
    i ++;
  }
  s /= ds;
  return s;
}