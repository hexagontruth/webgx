#include /common/partials/std-header-vertex

struct ProgramUniforms {
  bufferSize: f32,
  gridSize: f32,
  innerRadius: f32,
  scale: f32,
  wrap: f32,
  pulse: f32,
  centerSeed: f32,
  edgeSeed: f32,
  pulseInterval: f32,
  pulseMagnitude: f32,
  centerRadius: f32,
  centerMagnitude: f32,
  edgeRadius: f32,
  edgeMagnitude: f32,
  coef: vec3f,
  innerCoef: vec3f,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

const nbrs = array(
  vec3i( 1,  0, -1),
  vec3i( 0,  1, -1),
  vec3i(-1,  1,  0),
  vec3i(-1,  0,  1),
  vec3i( 0, -1,  1),
  vec3i( 1, -1,  0),
);

fn wrapGrid(p: vec3i) -> vec3i {
  var u = vec3f(p);
  u = hex2hex * u;
  u = u / pu.gridSize / sr3;
  u = getCubic(u);
  u = u * pu.gridSize * sr3;
  u = transpose(hex2hex) * u;
  u = roundCubic(u);
  return vec3i(u);
}

fn toHex(p: vec2u) -> vec3i {
  var bufferSize = i32(pu.bufferSize);
  var pi = vec2i(p) - bufferSize / 2;
  var u = vec3i(pi, -pi.x - pi.y);
  return u;
}

fn fromHex(p: vec3i) -> vec2u {
  var bufferSize = i32(pu.bufferSize);
  var u = p;
  u = u + bufferSize / 2;
  return vec2u(u.xy);
}

fn sampleCell(h: vec3i) -> vec2f {
  var p = fromHex(h);
  var offset = (p.x * u32(pu.bufferSize) + p.y) * 2;
  return vec2f(
    input[offset], input[offset + 1]
  );
}

fn writeCell(p: vec2u, v: vec2f) {
  var offset = (p.x * u32(pu.bufferSize) + p.y) * 2;
  output[offset] = v.x;
  output[offset + 1] = v.y;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var hex = cart2hex * (data.cv * gu.cover);
  var h = hex * pu.scale;
  h = wrapCubic(h);
  h = h * pu.gridSize;
  var p = interpolatedCubic(h);
  var c = unit.yyy;
  var v = 0.;
  for (var i = 0; i < 3; i++) {
    var u = p[i].xyz;
    var dist = p[i].w;
    var s = sampleCell(vec3i(u));
    c += hsv2rgb3(vec3f(
      s.x * 1,
      1 - abs(s.y) * 2,
      1,
    )) * dist;
    v += amax2(s) * 1 * dist;
  }
  c /= 3;
  c = rgb2hsv3(c);
  c.z = v;
  c = hsv2rgb3(c);
  c *= htWhite;
  // c = max(c, vec3f(qw1(amax3(hex) - 1, 1/pu.gridSize/16, 1/pu.gridSize/2)));
  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var p = vec2u(round((data.cv * gu.cover * 0.5 + 0.5) * pu.bufferSize));
  var offset = (p.x * u32(pu.bufferSize) + p.y) * 2;
  var s = vec2f(input[offset], input[offset + 1]);
  var c = vec3f(abs(s), s.x);
  return vec4f(c, 1);
}

@compute @workgroup_size(16, 16)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var size = i32(pu.bufferSize);
  var p = globalIdx.xy;
  var h = toHex(p);
  h = wrapGrid(h);
  var outer = amax3i(h) > i32(pu.innerRadius);
  var cur = sampleCell(h);
  var radius = amax3i(h);
  var next = unit.yy;
  var n = unit.yy;

  if (radius > i32(pu.gridSize)) {
    writeCell(p, unit.yy);
    return;
  }
  else if (gu.counter == 0) {
    next = cur;
    if (pu.centerSeed > 0 && radius <= i32(pu.centerRadius)) {
      next = unit.xx * pow(2, pu.centerMagnitude);
    }
    if (pu.edgeSeed > 0 && radius > i32(pu.gridSize - pu.edgeRadius)) {
      next = unit.xx * pow(2, pu.edgeMagnitude);
    }
    writeCell(p, next);
    return;
  }

  for (var i = 0; i < 6; i++) {
    var u = wrapGrid(h + nbrs[i]);
    var samp = sampleCell(u);
    n += samp * step(1, pu.wrap + 1 - step(pu.gridSize, amax3(vec3f(u))));
  }

  var coef = select(pu.innerCoef, pu.coef, outer);
  var a = (n.x - cur.x * 6) * coef.x;
  var v = (cur.y + a) * coef.y;
  var s = (cur.x + v) * coef.z;

  s = select(
    s + tsin1(gu.counter / pu.pulseInterval) * pow(2., pu.pulseMagnitude) * pu.pulse,
    s,
    outer
  );
  next = vec2f(s, v);
  writeCell(p, next);
}
