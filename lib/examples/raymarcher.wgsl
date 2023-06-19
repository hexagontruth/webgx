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
  b = sdTorus(v, vec2f(0.5, 0.125));
  a = length(v) -0.1;
  a = sdBox(v, unit.xxx*0.1);
  a= min(a, b);
  // a = b;
  for (var i = 0; i < 3; i++) {
    var u = trot2(unit.xy, gu.time + f32(i)/3.);
    var v = unit.yyy;
    v[i] = u[0];
    v[(i + 1) % 3] = u[1];
    b = length(p - v) - 0.1;
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
  var origin = (vec4(cart2hex(cv) + dist, 0)) * (1 - gu.time) * 3;
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