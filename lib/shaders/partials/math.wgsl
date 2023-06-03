fn clamp2(v : vec2f, a : f32, b : f32) -> vec2f {
  return clamp(v, vec2f(a), vec2f(b));
}

fn clamp3(v : vec3f, a : f32, b : f32) -> vec3f {
  return clamp(v, vec3f(a), vec3f(b));
}

fn clamp4(v : vec4f, a : f32, b : f32) -> vec4f {
  return clamp(v, vec4f(a), vec4f(b));
}
  
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

fn interpolatedCubic(p: vec3f) -> array<vec4f,3> {
  var q : vec3f;
  var v : array<vec3f,3>;
  var w : array<vec4f,3>;
  var alt : vec3f;
  var i0 : i32;
  var i1 : i32;
  var i2 : i32;

  var fl = floor(p);
  var cl = ceil(p);
  var r = round(p);
  var d = abs(r - p);

  for (var i = 0; i < 3; i++) {
    alt[i] = select(fl[i], cl[i], r[i] == fl[i]);
  }

  if (d.x > d.y && d.x > d.z) {
    i0 = 0;
  }
  else if (d.y > d.z) {
    i0 = 1;
  }
  else {
    i0 = 2;
  }
  i1 = (i0 + 1) % 3;
  i2 = (i0 + 2) % 3;

  r[i0] = -r[i1] - r[i2];
  v[0] = r;
  v[1] = r;
  v[2] = r;
  v[1][i1] = alt[i1];
  v[1][i0] = -v[1][i1] - v[1][i2];
  v[2][i2] = alt[i2];
  v[2][i0] = -v[2][i1] - v[2][i2];

  for (var i = 0; i < 3; i++) {
    q[i] = 1. - amax3(v[i] - p);
  }

  q = q / sum3(q);

  w[0] = vec4f(v[0], q.x);
  w[1] = vec4f(v[1], q.y);
  w[2] = vec4f(v[2], q.z);

  if (q.y < q.z) {
    // var temp = v[1];
    // v[1] = v[2];
    // v[2] = temp;
    w = array(w[0], w[2], w[1]);
  }
  return w;
}

fn extendedCubic(p: vec3f) -> array<vec3f, 12> {
  var dif : vec3f;
  var r = interpolatedCubic(p);
  var v : array<vec3f, 12>;
  v[0] = r[0].xyz;
  v[1] = r[1].xyz;
  v[2] = r[2].xyz;
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 2; j++) {
      dif = v[(i + j + 1) % 3] - v[(i + j + 2) % 3];
      v[3 + j + i * 3] = v[i] - dif;
    }
    dif = v[i] - v[(i + 1) % 3];
    v[5 + i * 3] = v[i] + dif;
  }
  return v;
}

fn rot2(p: vec2f, a: f32) -> vec2f {
  var ca = cos(a);
  var sa = sin(a);
  return mat2x2(
    ca, sa,
    -sa, ca
  ) * p;
}

fn rot3(p: vec3f, u: vec3f, a: f32) -> vec3f {
  var cosa = cos(a);
  var cosa1 = 1. - cosa;
  var sina = sin(a);
  var m = mat3x3(
    cosa + u.x * u.x * cosa1,         u.x * u.y * cosa1 + u.z * sina,   u.z * u.x * cosa1 - u.y * sina,
    u.x * u.y * cosa1 - u.z * sina,   cosa + u.y * u.y * cosa1,         u.z * u.y * cosa1 + u.x * sina,
    u.x * u.z * cosa1 + u.y * sina,   u.y * u.z * cosa1 - u.x * sina,   cosa + u.z * u.z * cosa1
  );
  return m * p;
}

fn trot2(p: vec2f, a: f32) -> vec2f {
  return rot2(p, a * tau);
}

fn trot3(p: vec3f, u: vec3f, a: f32) -> vec3f {
  return rot3(p, u, a * tau);
}

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


fn sum2(p: vec2f) -> f32 {
  return p.x + p.y;
}

fn sum3(p: vec3f) -> f32 {
  return p.x + p.y + p.z;
}

fn sum4(p: vec4f) -> f32 {
  return p.x + p.y + p.z + p.w;
}

fn prod2(p: vec2f) -> f32 {
  return p.x * p.y;
}

fn prod3(p: vec3f) -> f32 {
  return p.x * p.y * p.z;
}

fn prod4(p: vec4f) -> f32 {
  return p.x * p.y * p.z * p.w;
}

fn project2(a: vec2f, b: vec2f) -> vec2f {
  return dot(a, b) / dot(b, b) * b;
}

fn project3(a: vec3f, b: vec3f) -> vec3f {
  return dot(a, b) / dot(b, b) * b;
}

fn project4(a: vec4f, b: vec4f) -> vec4f {
  return dot(a, b) / dot(b, b) * b;
}

fn hexProject(p: vec3f) -> vec3f {
  var n = project3(p, unit.xxx);
  return p - n;
}

fn angle2vec(a: f32) -> vec2f {
  return vec2f(cos(a), sin(a));
}

fn dreflect2(cv: vec2f, n: vec2f) -> vec2f {
  return cv - n * min(0., dot(cv, n)) * 2.;
}

fn dreflect3(cv: vec3f, n: vec3f) -> vec3f {
  return cv - n * min(0., dot(cv, n)) * 2.;
}

fn dreflect4(cv: vec4f, n: vec4f) -> vec4f {
  return cv - n * min(0., dot(cv, n)) * 2.;
}

fn areflect2(cv: vec2f, a: f32) -> vec2f {
  var n = angle2vec(a);
  return cv - n * min(0., dot(cv, n)) * 2.;
}

fn treflect2(cv: vec2f, a: f32) -> vec2f {
  return areflect2(cv, a * tau);
}

fn slength(u: vec2f, v: vec2f, p: vec2f) -> f32 {
  var w : vec2f;
  var x : vec2f;
  var z : vec2f;
  w = u - v;
  x = p - v;
  z = project2(x, w);
  z = clamp(z, min(w, unit.yy), max(w, unit.yy));
  return length(z - x);
}

fn slengthp(u: vec3f, v: vec3f, p: vec3f) -> f32 {
  return slength(hex2cart(hexProject(u)), hex2cart(hexProject(v)), hex2cart(p));
}

fn clength(u: vec2f, v: vec2f, p: vec2f) -> f32 {
  var w : vec2f;
  var x : vec2f;
  var z : vec2f;
  w = u - v;
  x = p - v;
  z = project2(x, w);
  z = clamp(z, min(w, unit.yy), max(w, unit.yy));
  return amax3(cart2hex(z) - cart2hex(x));
}

fn gaussian2(v: vec2f, sd: f32) -> f32 {
  return 1./(tau * sd * sd) * exp(-(v.x * v.x + v.y * v.y) / (2. * sd * sd));
}