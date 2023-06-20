#include /common/partials/std-header-vertex
#include /common/partials/sdf

#param ITER 1024
#param MAX_DIST 64
#param SURF_DIST (1. / pow(2., 16.))
#param NORMAL_DIST (1. / pow(2., 10.))

struct ProgramUniforms {
  color: vec4f,
  specular: f32,
  rotX: f32,
  rotY: f32,
  rotZ: f32,
  truncation: f32,
  thiccness: f32,
  scale: f32,
  speed: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

fn veMap(p: vec3f) -> f32 {
  var a = sdOct(p, 2);
  a = max(a, sdCube(p, 2 * pu.truncation));
  return a;
}

fn map(p: vec3f) -> f32 {
  var a : f32;
  var b : f32;
  var u = p;
  u = trot3(u, normalize(unit.yyx), -cu.leftDelta.x/4);
  u = trot3(u, normalize(unit.xzy), -cu.leftDelta.y/4);

  var v = u;
  v = trot3(v, unit.xyy, gu.time * pu.rotX);
  v = trot3(v, unit.yxy, gu.time * pu.rotY);
  v = trot3(v, unit.yyx, gu.time * pu.rotZ);

  a = sdOct(v, 2);
  a = veMap(v);
  v += gu.time * pu.speed;
  b = abs(dot(tsin3(v * pu.scale), tcos3(v.yzx * pu.scale))) - max(pu.thiccness, 1/16.);
  a = max(a, b);

  return a;
}

fn getNormal(p: vec3f) -> vec3f {
  var e = unit * $NORMAL_DIST;
  var v = (
    unit.xzz * map(p + e.xzz) +
    unit.zxz * map(p + e.zxz) +
    unit.zzx * map(p + e.zzx) +
    unit.xxx * map(p + e.xxx)
  );
  v = select(normalize(v), v, length(v) == 0);
  return v;
}

fn march(r: vec3f, d: vec3f) -> f32 {
  var m = 0.;
  var p = r;
  for (var i = 0; i < $ITER; i++) {
    var dist = map(p);
    // Why is this necessary? What am I doing wrong? Somebody plz help
    dist *= 0.1;
    m += dist;
    p = r + d * m;
    if (abs(m) > $MAX_DIST || abs(dist) < $SURF_DIST) {
      break;
    }
  }
  return m;
}

fn phong(
  d: vec3f,
  p: vec3f,
  lightPos: vec3f,
  aColor: vec3f,
  dColor: vec3f,
  sColor: vec3f,
  s: f32
) -> vec3f {
    var n = getNormal(p);
    var light = normalize(lightPos - d);
    var view = normalize(d - p);

    var rf = normalize(reflect(light, n));
    var dif = dColor * max(dot(light, n), 0);
    var spec = sColor * pow(max(dot(view, rf), 0), s,);

    return aColor + dif + spec;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  var cv = data.cv * gu.cover;
  var c = unit.yyy;
  var offset = 5.;
  var dist = 2.5 + cu.scrollDelta;
  var camPos = cu.leftDelta;
  var dir : vec3f;
  var or : vec3f;

  dir = normalize(unit.zzz);
  or = (c2h * cv + offset) * -dir * dist;

  var m = march(or, dir);
  var bg = step(32, m);
  var p = or + dir * m;
  var n = getNormal(p);

  c = (n);
  // c = vec4f(m);
  // c = clamp(c, unit.yyyy, unit.xxxx);
  c = rgb2hsv3(c);
  c.x += gu.time;
  c.y = min(c.y, 0.75);
  c.z = min(c.z, 0.75);
  c.z += dot(n, unit.yyx);
  c = hsv2rgb3(c);
  var ambient = pu.color.rgb * 0.25;
  var diffuse = n * 0.75;
  var specFact = pow(2, pu.specular);
  var spec = mix(diffuse, unit.xxx, specFact/1024);
  c = phong(dir, p, unit.xxx , ambient, diffuse, spec, specFact);
  c = mix(c, unit.yyy, bg);
  return vec4f(c.rgb, 1);
}

@fragment
fn fragmentFilter(data: VertexData) -> @location(0) vec4f {
  return medianFilter(data.uv);
}