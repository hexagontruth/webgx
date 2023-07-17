// These are from some random Github gist I found years ago that now I can't find.
// If anyone knows who wrote these plz let me know lol.

fn cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn clog(z: vec2f) -> vec2f {
  return vec2f(
    log(length  (z)),
    atan2(z.y, z.x)
  );
}

fn cexp(z: vec2f) -> vec2f {
  return vec2f(cos(z.y), sin(z.y)) * exp(z.x);
}

fn cpow(z: vec2f, x: f32) -> vec2f {
  var r = length(z);
  var theta = atan2(z.y, z.x) * x;
  return vec2f(cos(theta), sin(theta)) * pow(r, x);
}

fn cpowc(a: vec2f, b: vec2f) -> vec2f {
  var aarg = atan2(a.y, a.x);
  var amod = length(a);

  var theta = log(amod) * b.y + aarg * b.x;

  return vec2f(
    cos(theta),
    sin(theta)
  ) * pow(amod, b.x) * exp(-aarg * b.y);
}

fn csqrt(z: vec2f) -> vec2f {
  var t = sqrt(2.0 * (length(z) + select(-z.x, z.x, z.x >= 0.)));
  var f = vec2f(0.5 * t, abs(z.y) / t);

  if (z.x < 0.0) { f = f.yx; }
  if (z.y < 0.0) { f.y = -f.y; }

  return f;
}

fn cdiv(a: vec2f, b: vec2f) -> vec2f {
  var e : f32;
  var f : f32;
  var g = 1.;
  var h = 1.;

  if( abs(b.x) >= abs(b.y) ) {
    e = b.y / b.x;
    f = b.x + b.y * e;
    h = e;
  } else {
    e = b.x / b.y;
    f = b.x * e + b.y;
    g = e;
  }

  return (a * g + h * vec2f(a.y, -a.x)) / f;
}

fn sinhcosh(x: f32) -> vec2f {
  var ex = exp(vec2f(x, -x));
  return 0.5 * (ex - vec2f(ex.y, -ex.x));
}

fn catan(z: vec2f) -> vec2f {
  var a = z.x * z.x + (1.0 - z.y) * (1.0 - z.y);
  var b = clog(vec2f(1.0 - z.y * z.y - z.x * z.x, -2.0 * z.x) / a);
  return 0.5 * vec2f(-b.y, b.x);
}

fn catanh(z: vec2f) -> vec2f {
  var oneMinus = 1.0 - z.x;
  var onePlus = 1.0 + z.x;
  var d = oneMinus * oneMinus + z.y * z.y;

  var x = vec2f(onePlus * oneMinus - z.y * z.y, z.y * 2.0) / d;

  var result = vec2f(log(length  (x)), atan2(x.y, x.x)) * 0.5;

  return result;
}

fn casin(z: vec2f) -> vec2f {
  var a = csqrt(vec2f(
    z.y * z.y - z.x * z.x + 1.0,
    -2.0 * z.x * z.y
  ));

  var b = clog(vec2f(
    a.x - z.y,
    a.y + z.x
  ));

  return vec2f(b.y, -b.x);
}

fn casinh(z: vec2f) -> vec2f {
  var res = casin(vec2f(z.y, -z.x));
  return vec2f(-res.y, res.x);
}

fn cacot(z: vec2f) -> vec2f {
  return catan(vec2f(z.x, -z.y) / dot(z, z));
}

fn cacoth(z: vec2f) -> vec2f {
  return catanh(vec2f(z.x, -z.y) / dot(z, z));
}


fn csin(z: vec2f) -> vec2f {
  return sinhcosh(z.y).yx * vec2f(sin(z.x), cos(z.x));
}

fn csinh(z: vec2f) -> vec2f {
  return sinhcosh(z.x) * vec2f(cos(z.y), sin(z.y));
}

fn ccos(z: vec2f) -> vec2f {
  return sinhcosh(z.y).yx * vec2f(cos(z.x), -sin(z.x));
}

fn ccosh(z: vec2f) -> vec2f {
  return sinhcosh(z.x).yx * vec2f(cos(z.y), sin(z.y));
}

fn ctan(z: vec2f) -> vec2f {
  var e2iz = cexp(2.0 * vec2f(-z.y, z.x));

  return cdiv(
    e2iz - vec2f(1, 0),
    vec2f(-e2iz.y, 1.0 + e2iz.x)
  );
}

fn ctanh(z: vec2f) -> vec2f {
  var sch = sinhcosh(z.x * 2.);
  return vec2f(sch.x, sin(z.y)) / (sch.y + cos(z.y * 2.));
}
