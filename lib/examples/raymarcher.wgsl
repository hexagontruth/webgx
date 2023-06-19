#include /common/partials/std-header-vertex
#include /common/partials/sdf

#param ITER 16384
#param MAX_DIST 128
#param SURF_DIST (1. / pow(2., 20.))
#param NORMAL_DIST (1. / pow(2., 12.))

// struct ProgramUniforms {
// };

// @group(1) @binding(0) var<uniform> pu : ProgramUniforms;

fn map3(p: vec3f) -> f32 {
  var a : f32;
  var b : f32;
  var v = trot3(p + unit.xxx * 0., unit.xyy, gu.time);
  a = sdBox(v + unit.xxx, vec3f(0.5, 0.5, 1));
  b = sdLongTorus(v, vec2f(0.5, 0.125), 0.707);
  a = length(v) - 0.1;
  a = sdHex(v, vec2f(1, 0.2));
  a = max(a, -sdHex(v, vec2f(0.75, 1)));
  a = sdLongSphere(v + unit.yxy*tsin1(0.125 + gu.time * 8) *1., vec2f(1.,0.1));
  // a = min(a, length(v + unit.yxy*tsin1(gu.time*4)*3) - 0.2);
  a = smin(a, b, 0.5);
  b = sdBoxFrame(p, unit.xxx, 0.01);
  a = min(a, b);
  // a = b;
  for (var i = 0; i < 3; i++) {
    var u = trot2(unit.xy * 2., gu.time + f32(i)/3.);
    var v = unit.yyy;
    v[i] = u[0];
    v[(i + 1) % 3] = u[1];
    b = length(p - v) - 0.2;
    a = min(a, b);
  }

  return a;
}

fn map(p: vec4f) -> f32 {
  return map3(p.xyz);
}

fn getNormal(p: vec4f) -> vec4f {
  var e = unit * $NORMAL_DIST;
  var v = (
    unit.xzzy * map(p + e.xzzy) +
    unit.zxzy * map(p + e.zxzy) +
    unit.zzxy * map(p + e.zzxy) +
    unit.xxxy * map(p + e.xxxy)
  );
  v = select(normalize(v), v, length(v) == 0);
  return v;
}

fn march(r: vec4f, d: vec4f) -> f32 {
  var m = 0.;
  var p = r;
  for (var i = 0; i < $ITER; i++) {
    var dist = map(p);
    m += dist;
    p = r + d * m;
    if (abs(m) > $MAX_DIST || abs(dist) < $SURF_DIST) {
      break;
    }
  }
  return m;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  var cv = data.cv * gu.cover;
  var c = unit.yyyx;
  var dist = 3.;
  var origin = (vec4(c2h * cv + dist, 0)) * 2.3;
  // origin *= (1 - gu.time);
  var dir = normalize(unit.zzzy);
  // origin = vec4(cv, (1 - gu.time) * 3, 0);
  // dir = normalize(unit.yyzy);
  var m = march(origin, dir);

  var p = origin + dir * m;
  var n = getNormal(p);

  c = (n);
  // c = vec4f(m);
  // c = clamp(c, unit.yyyy, unit.xxxx);
  c = rgb2hsv(c);
  c.x += gu.time;
  c.y = min(c.y, 0.75);
  c.z = min(c.z, 0.75);
  c.z += dot(n, unit.yyxy);
  c = hsv2rgb(c);
  return vec4f(c.rgb, 1);
}

@fragment
fn fragmentFilter(data: VertexData) -> @location(0) vec4f {
  return medianFilter(data.uv);
}