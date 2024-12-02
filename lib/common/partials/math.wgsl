fn step2(s: f32, v: vec2f) -> vec2f {
  return step(vec2f(s), v);
}

fn step3(s: f32, v: vec3f) -> vec3f {
  return step(vec3f(s), v);
}

fn step4(s: f32, v: vec4f) -> vec4f {
  return step(vec4f(s), v);
}

fn smoothstep2(a: f32, b: f32, v: vec2f) -> vec2f {
  return smoothstep(vec2f(a), vec2f(b), v);
}

fn smoothstep3(a: f32, b: f32, v: vec3f) -> vec3f {
  return smoothstep(vec3f(a), vec3f(b), v);
}

fn smoothstep4(a: f32, b: f32, v: vec4f) -> vec4f {
  return smoothstep(vec4f(a), vec4f(b), v);
}

fn easeCircle(x : f32) -> f32 {
  return sqrt(1 - pow(x - 1, 2));
}

fn clamp2(v : vec2f, a : f32, b : f32) -> vec2f {
  return clamp(v, vec2f(a), vec2f(b));
}

fn clamp3(v : vec3f, a : f32, b : f32) -> vec3f {
  return clamp(v, vec3f(a), vec3f(b));
}

fn clamp4(v : vec4f, a : f32, b : f32) -> vec4f {
  return clamp(v, vec4f(a), vec4f(b));
}

fn mix2(a: vec2f, b: vec2f, r: f32) -> vec2f {
  return mix(a, b, vec2f(r));
}

fn mix3(a: vec3f, b: vec3f, r: f32) -> vec3f {
  return mix(a, b, vec3f(r));
}

fn mix4(a: vec4f, b: vec4f, r: f32) -> vec4f {
  return mix(a, b, vec4f(r));
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

fn getCubic(p: vec3f) -> vec3f {
  return p - roundCubic(p);
}

fn wrapCubic(p: vec3f, radius: f32) -> vec3f {
  var u = hex2hex * p;
  u = u / radius / sr3;
  u = getCubic(u);
  u = u * radius * sr3;
  u = transpose(hex2hex) * u;
  return u;
}

fn wrapGrid(p: vec3i, radius: f32) -> vec3i {
  var u = wrapCubic(vec3f(p), radius);
  u = roundCubic(u);
  return vec3i(u);
}

fn wrapGridUniqueOld(p: vec3i, radius: f32) -> vec3i {
  // There is a more efficient way to do this
  // But I don't want to do it

  var u = vec3f(p);

  if (amax3(u) > radius) {
    u = vec3f(wrapGrid(p, radius));
  }

  // Is corner and not in canonical z+ location
  if (max3(u) == radius && min3(u) == -radius && u.z != radius) {
    u = u.yzx;
    if (u.z != radius) {
      u = u.yzx;
    }
  }
  // Is non-corner z- edge
  else if (amax3(u) == radius && u.z < 0) {
    u = -u;
    u = select(
      select(
        u.yxz,
        u.zyx,
        u.y == -radius,
      ),
      u.xzy,
      u.x == -radius,
    );
  }
  return vec3i(u);
}

fn wrapGridUnique(p: vec3i, radius: f32) -> vec3i {
  // The more efficient way
  var r = i32(radius);
  var m = r * 3;
  var offset = i32(ceil(radius * 3 / 2.));

  var u = p;
  u += offset;
  u = (u % m + m) % m;
  u -= offset;
  u.z = -u.x - u.y;

  // Skip all if we are safely ensconced in the grid
  if (amax3i(u) >= r) {
    // Top right
    if (u.x + u.y >= r && u.x >= 0 && u.y >= 0) {
      u += vec3i(-r, -r, r * 2);
    }
    // Bottom left
    else if (u.x + u.y < -r && u.x < 0 && u.y < 0) {
      u += vec3i(r, r, -r * 2);
    }
    // Top left
    else if (u.x < -r || u.y >= r) {
      if (u.z > 0) {
        u += vec3i(r * 2, -r, -r);
      }
      else {
        u += vec3i(r, -r * 2, r);
      }
    }
    // Bottom right
    else if (u.x >= r || u.y < -r) {
      if (u.z > 0) {
        u += vec3i(-r, r * 2, -r);
      }
      else {
        u += vec3i(-r * 2, r, r);
      }
    }
  }
  return u;
}

fn isWrapped(u: vec3i, v: vec3i) -> bool {
  return sum3(abs(vec3f(u - v))) != 0;
}

fn toHex(p: vec2i, dim: i32) -> vec3i {
  var u = p - dim / 2;
  return vec3i(u, -u.x - u.y);
}

fn fromHex(p: vec3i, dim: i32) -> vec2i {
  var u = p.xy + dim / 2;
  return u;
}

fn toHexBufferAlt(p: vec3i, r: i32) -> i32 {
  // Normalize x and y to be in the range [0, r - 1]
  var u = p.xy + r;
  // Count offset rows
  var bottomRows = min(r - 1, u.y) + 1;
  var topRows = max(0, p.y);
  // Each offset is the difference of two triangular numbers
  var bottomOffset = r * (r + 1) / 2 - (r - bottomRows) * (r - bottomRows + 1) / 2;
  var topOffset = topRows * (topRows + 1) / 2;
  var idx = u.y * r * 2 + u.x - bottomOffset - topOffset;
  return idx;
}

fn toHexBuffer(p: vec3i, r: i32) -> i32 {
  // This is more easily reversible imo
  var u = p.xy;
  var q = 0;
  if (u.x >= 0 && u.y >= 0) {
    u -= r;
  }
  else if (u.x >= 0) {
    q = 1;
  }
  else if (u.y >= 0) {
    q = 2;
  }
  u = (p.xy % r + r) % r;
  var idx = r * r * q + u.y * r + u.x;
  return idx;
}

fn fromHexBuffer(idx: i32, r: i32) -> vec3i {
  var square = r * r;
  var q = idx / square;
  var i = idx % square;
  var u = vec2i(i % r, i / r);
  return vec3i(u, -u.x - u.y);
}

fn hexbin(base : vec2f, s : f32) -> vec4f {
  var res = s / 3;
  var cv = base * res;
  var dv : vec2f;
  var ev : vec2f;

  var r = vec2f(1/sr3, 1);
  var h = r * 0.5;

  var a = mv2(cv, r) - h;
  var b = mv2(cv - h, r) - h;
  dv = select(b, a, length(a) < length(b));
  ev = (cv - dv) / res;

  return vec4f(dv * 3, ev);
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

fn rot3m(p: mat3x3<f32>, u: vec3f, a: f32) -> mat3x3<f32> {
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

fn trot3m(p: mat3x3<f32>, u: vec3f, a: f32) -> mat3x3<f32> {
  return rot3m(p, u, a * tau);
}

fn rotHex(p: vec3f, a: f32) -> vec3f {
  return rot3(p, normalize(unit.xxx), a);
}

fn trotHex(p: vec3f, a: f32) -> vec3f {
  return rot3(p, normalize(unit.xxx), a * tau);
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

fn amax2u(v: vec2u) -> u32 {
  var a = abs(v);
  return max(a.x, a.y);
}

fn amax3u(v: vec3u) -> u32 {
  var a = abs(v);
  return max(max(a.x, a.y), a.z);
}

fn amax4u(v: vec4u) -> u32 {
  var a = abs(v);
  return max(max(max(a.x, a.y), a.z), a.w);
}

fn amax2i(v: vec2i) -> i32 {
  var a = abs(v);
  return max(a.x, a.y);
}

fn amax3i(v: vec3i) -> i32 {
  var a = abs(v);
  return max(max(a.x, a.y), a.z);
}

fn amax4i(v: vec4i) -> i32 {
  var a = abs(v);
  return max(max(max(a.x, a.y), a.z), a.w);
}

fn amin2(v: vec2f) -> f32 {
  var a = abs(v);
  return min(a.x, a.y);
}

fn amin3(v: vec3f) -> f32 {
  var a = abs(v);
  return min(min(a.x, a.y), a.z);
}

fn amin4(v: vec4f) -> f32 {
  var a = abs(v);
  return min(min(min(a.x, a.y), a.z), a.w);
}

fn max2(v: vec2f) -> f32 {
  return max(v.x, v.y);
}

fn max3(v: vec3f) -> f32 {
  return max(max(v.x, v.y), v.z);
}

fn max4(v: vec4f) -> f32 {
  return max(max(max(v.x, v.y), v.z), v.w);
}

fn min2(v: vec2f) -> f32 {
  return min(v.x, v.y);
}

fn min3(v: vec3f) -> f32 {
  return min(min(v.x, v.y), v.z);
}

fn min4(v: vec4f) -> f32 {
  return min(min(min(v.x, v.y), v.z), v.w);
}

fn m1(n: f32, m: f32) -> f32 {
  return (n % m + m) % m;
}

fn m2(n: vec2f, m: f32) -> vec2f {
  return (n % m + m) % m;
}

fn m3(n: vec3f, m: f32) -> vec3f {
  return (n % m + m) % m;
}

fn m4(n: vec4f, m: f32) -> vec4f {
  return (n % m + m) % m;
}

fn m1i(n: i32, m: i32) -> i32 {
  return (n % m + m) % m;
}

fn m2i(n: vec2i, m: i32) -> vec2i {
  return (n % m + m) % m;
}

fn m3i(n: vec3i, m: i32) -> vec3i {
  return (n % m + m) % m;
}

fn m4i(n: vec4i, m: i32) -> vec4i {
  return (n % m + m) % m;
}

fn mv2(n: vec2f, m: vec2f) -> vec2f {
  return (n % m + m) % m;
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

fn xsum1(s: f32, q: f32) -> f32 {
  return s + q - 2. * s * q;
}

fn xsum2(s: vec2f, q: vec2f) -> vec2f {
  return s + q - 2. * s * q;
}

fn xsum3(s: vec3f, q: vec3f) -> vec3f {
  return s + q - 2. * s * q;
}

fn xsum4(s: vec4f, q: vec4f) -> vec4f {
  return s + q - 2. * s * q;
}

fn tsin1(n: f32) -> f32 {
  return sin(n * tau);
}

fn tsin2(n: vec2f) -> vec2f {
  return sin(n * tau);
}

fn tsin3(n: vec3f) -> vec3f {
  return sin(n * tau);
}

fn tsin4(n: vec4f) -> vec4f {
  return sin(n * tau);
}

fn tcos1(n: f32) -> f32 {
  return cos(n * tau);
}

fn tcos2(n: vec2f) -> vec2f {
  return cos(n * tau);
}

fn tcos3(n: vec3f) -> vec3f {
  return cos(n * tau);
}

fn tcos4(n: vec4f) -> vec4f {
  return cos(n * tau);
}

fn osc1(n: f32) -> f32 {
  return cos((n + 0.5) * tau) * 0.5 + 0.5;
}

fn osc2(n: vec2f) -> vec2f {
  return cos((n + 0.5) * tau) * 0.5 + 0.5;
}

fn osc3(n: vec3f) -> vec3f {
  return cos((n + 0.5) * tau) * 0.5 + 0.5;
}

fn osc4(n: vec4f) -> vec4f {
  return cos((n + 0.5) * tau) * 0.5 + 0.5;
}

fn triwave1(n: f32) -> f32 {
  return abs(fract(n - 0.25) - 0.5) * 2. - 0.5;
}

fn triwave2(n: vec2f) -> vec2f {
  return abs(fract(n - 0.25) - 0.5) * 2. - 0.5;
}

fn triwave3(n: vec3f) -> vec3f {
  return abs(fract(n - 0.25) - 0.5) * 2. - 0.5;
}

fn triwave4(n: vec4f) -> vec4f {
  return abs(fract(n - 0.25) - 0.5) * 2. - 0.5;
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

fn tangle2vec(a: f32) -> vec2f {
  return angle2vec((a - 0.5) * tau);
}

fn tatan(v: vec2f) -> f32 {
  return atan2(v.y, v.x) / tau + 0.5;
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

fn hexReflect(p: vec2f) -> vec2f {
  var v = p;
  v = treflect2(v, 0);
  v = treflect2(v, -1/6.);
  v = treflect2(v, 1/6.);
  return v;
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
  return slength(hex2cart * hexProject(u), hex2cart * hexProject(v),hex2cart * p);
}

fn clength(u: vec2f, v: vec2f, p: vec2f) -> f32 {
  var w : vec2f;
  var x : vec2f;
  var z : vec2f;
  w = u - v;
  x = p - v;
  z = project2(x, w);
  z = clamp(z, min(w, unit.yy), max(w, unit.yy));
  return amax3(cart2hex * z - cart2hex * x);
}

fn gaussian2(v: vec2f, sd: f32) -> f32 {
  return 1./(tau * sd * sd) * exp(-(v.x * v.x + v.y * v.y) / (2. * sd * sd));
}

fn quantizeEp1(f: f32, n: f32, ep: f32) -> f32 {
  return floor(clamp(f * n, 0., n - ep)) / n;
}

fn quantizeEp2(f: vec2f, n: f32, ep: f32) -> vec2f {
  return floor(clamp2(f * n, 0., n - ep)) / n;
}

fn quantizeEp3(f: vec3f, n: f32, ep: f32) -> vec3f {
  return floor(clamp3(f * n, 0., n - ep)) / n;
}

fn quantizeEp4(f: vec4f, n: f32, ep: f32) -> vec4f {
  return floor(clamp4(f * n, 0., n - ep)) / n;
}

fn quantize1(f: f32, n: f32) -> f32 {
  return quantizeEp1(f, n, 1./16384.);
}

fn quantize2(f: vec2f, n: f32) -> vec2f {
  return quantizeEp2(f, n, 1./16384.);
}

fn quantize3(f: vec3f, n: f32) -> vec3f {
  return quantizeEp3(f, n, 1./16384.);
}

fn quantize4(f: vec4f, n: f32) -> vec4f {
  return quantizeEp4(f, n, 1./16384.);
}

fn qw1(n: f32, q: f32, w: f32) -> f32 {
  return smoothstep(w/2. + q/2., w/2. - q/2., abs(n));
}

fn qw2(n: vec2f, q: f32, w: f32) -> vec2f {
  return smoothstep(vec2f(w/2. + q/2.), vec2f(w/2. - q/2.), abs(n));
}

fn qw3(n: vec3f, q: f32, w: f32) -> vec3f {
  return smoothstep(vec3f(w/2. + q/2.), vec3f(w/2. - q/2.), abs(n));
}

fn qw4(n: vec4f, q: f32, w: f32) -> vec4f {
  return smoothstep(vec4f(w/2. + q/2.), vec4f(w/2. - q/2.), abs(n));
}

fn qwp1(n: f32, q: f32, w: f32) -> f32 {
  return qw1(abs(fract(n + 0.5) - 0.5), q, w);
}

fn qwp2(n: vec2f, q: f32, w: f32) -> vec2f {
  return qw2(abs(fract(n + 0.5) - 0.5), q, w);
}

fn qwp3(n: vec3f, q: f32, w: f32) -> vec3f {
  return qw3(abs(fract(n + 0.5) - 0.5), q, w);
}

fn qwp4(n: vec4f, q: f32, w: f32) -> vec4f {
  return qw4(abs(fract(n + 0.5) - 0.5), q, w);
}

fn p1(n: f32, p: f32) -> f32 {
  return (fract(n / p + 0.5) - 0.5) * p;
}

fn p2(n: vec2f, p: f32) -> vec2f {
  return (fract(n / p + 0.5) - 0.5) * p;
}

fn p3(n: vec3f, p: f32) -> vec3f {
  return (fract(n / p + 0.5) - 0.5) * p;
}

fn p4(n: vec4f, p: f32) -> vec4f {
  return (fract(n / p + 0.5) - 0.5) * p;
}
