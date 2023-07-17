#include /common/partials/std-header-vertex
#include /common/partials/complex

// This is inspired loosely by a thing Matt Henderson made in 2020:
// https://twitter.com/matthen2/status/1257989139426766849
// https://www.shadertoy.com/view/3dlBRf

struct ProgramUniforms {
  power: f32,
  innerScale: f32,
  outerScale: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

struct FractData {
  z: vec2f,
  max: vec2f,
  min: vec2f,
  avg: vec2f,
  dist: f32,
  count: f32,
  div: f32,
}

fn map(z: vec2f, c: vec2f) -> FractData {
  var data : FractData;
  data.z = z;
  data.min = unit.xx * 100.;
  var maxDist = 0.;
  var minDist = 100.;

  for (var i = 0; i < 64; i++) {
    var oldZ = data.z;
    // data.z = trot2(csin(data.z), gu.time);
    data.z = select(cpow(data.z, pu.power), data.z, sum2(data.z) == 0);
    data.z += c;
    if (length(data.z) > 64.) {
      data.div = 1;
      break;
    }
    var zDist = length(data.z);
    if (zDist > maxDist) {
      data.max = data.z;
      maxDist = zDist;
    }
    if (zDist < minDist) {
      data.min = data.z;
      minDist = zDist;
    }
    data.avg += data.z;
    data.dist += length(data.z - oldZ);
    data.count += 1;
  }
  data.avg /= data.count;
  return data;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var c: vec3f;
  var s: vec3f;
  var v = data.cv.yx / gu.cover.xy * unit.zx;
  var offset = cu.leftDelta.yx * unit.zx;
  var scale = pow(2, pu.outerScale);
  var t = osc1(gu.time);
  var bin = hexbin(v, 1 + 71 * t);
  var z = bin.xy * pu.innerScale;
  var d = bin.zw * scale - offset;
  var f = map(z, d);

  c.x = 0.5 + f.count/24.;
  c.y = 0.75;
  c.z = f.div;
  c = hsv2rgb3(c);

  f = map(unit.yy, v * scale - offset);

  s.x = 0.5 + f.count/24.;
  s.y = 0.75;
  s.z = f.div;
  s = hsv2rgb3(s);

  c = mix(c, s, t * t * 0.5);
  c = mix(c, texture(stream, (f.z.yx * unit.xz * 0.5 + 0.5)).rgb, gu.streamActive);
  return vec4f(c, 1);
}
