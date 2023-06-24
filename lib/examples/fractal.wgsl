#include /common/partials/std-header-vertex
#include /common/partials/complex

// struct ProgramUniforms {
// };

// @group(1) @binding(0) var<uniform> pu : ProgramUniforms;

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
    // data.z = trot2(csin(data.z), gu.time);
    var oldZ = data.z;
    data.z = cmul(data.z, data.z) + c;
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
  var bin = hexbin(v, 1 + 71 * osc1(gu.time));
  var z = bin.xy * 1.75;
  var d = bin.zw - unit.xy * 0.5;
  var f = map(z, d);

  c.z = f.div;
  c.x = 0.5 + f.count/24.;
  c.y = 0.5;
  c = hsv2rgb3(c);

  c = mix(c, texture(stream, (f.z.yx * unit.xz * 0.5 + 0.5)).rgb, gu.streamActive);
  return vec4f(c, 1);
}

@fragment
fn fragmentFilter(data: VertexData) -> @location(0) vec4f {
  var s = texture(inputTexture, data.uv);
  var t = texture(lastTexture, scaleUv(data.uv, 1));
  s = mix(s, t, 0.);
  return s;
}