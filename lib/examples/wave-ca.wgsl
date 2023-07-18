#include /common/partials/std-header-vertex
#include /common/partials/filters
#include /common/partials/test

struct ProgramUniforms {
  bufferSize: f32,
  gridSize: f32,
  innerRadius: f32,
  wrap: f32,
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
  u = wrapGrid(u);
  return u;
}

fn fromHex(p: vec3i) -> vec2u {
  var bufferSize = i32(pu.bufferSize);
  var u = p;
  u = wrapGrid(u);
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

fn writeCell(h: vec3i, v: vec2f) {
  var p = fromHex(h);
  var offset = (p.x * u32(pu.bufferSize) + p.y) * 2;
  output[offset] = v.x;
  output[offset + 1] = v.y;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var hex = cart2hex * (data.cv * gu.cover);
  var h = vec3i(roundCubic(hex * pu.gridSize));
  var s= sampleCell(h);
  var c = vec3f(abs(s.x)/16, s);
  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var p = vec2u((data.cv * gu.cover * 0.5 + 0.5) * pu.bufferSize);
  var h = toHex(p);
  var s = sampleCell(h);
  var c = vec3f(abs(s.x)/16, s);
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
  var cur = sampleCell(h);
  var next = unit.yy;
  var n = unit.yy;
  for (var i = 0; i < 6; i++) {
    var u = wrapGrid(h + nbrs[i]);
    var samp = sampleCell(u);
    n += samp * step(1, pu.wrap + 1 - step(pu.gridSize, amax3(vec3f(u))));
  }

  var coef = select(pu.innerCoef, pu.coef, amax3i(h) > i32(pu.innerRadius));
  var a = (n.x - cur.x * 6) * coef.x;
  var v = (cur.y + a) * coef.y;
  var s = (cur.x + v) * coef.z;

  next = vec2f(s, v);
  next = select(next, cur, gu.time == 0);
  writeCell(h, next);
}
