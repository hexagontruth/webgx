#include /common/partials/std-header-vertex
#include /common/partials/filters
#include /common/partials/test

struct ProgramUniforms {
  bufferSize: f32,
  gridSize: f32,
  numStates: f32,
  color: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

const nbrs = array(
  vec3i(-1, 0, 1),
  vec3i(-1, 1, 0),
  vec3i(0, 1, -1),
  vec3i(1, 0, -1),
  vec3i(1, -1, 0),
  vec3i(0, -1, 1),
);

fn wrapGridOld(p: vec3i) -> vec3i {
  var gridSize = i32(pu.gridSize);
  var u = p;
  u = u % (gridSize + 1);
  u = select(u, -gridSize * sign(u) + u, amax2i(u.xy) > gridSize);
  return u;
}

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

fn sampleCell(h: vec3i) -> f32 {
  var p = fromHex(h);
  return input[p.x * u32(pu.bufferSize) + p.y];
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  // TBD
  return vec4f(unit.yyy, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var p = vec2u((data.cv * gu.cover * 0.5 + 0.5) * pu.bufferSize);
  var h = toHex(p);
  var s = sampleCell(h) / pu.numStates;
  var c = mix(
    vec3f(s),
    hsv2rgb3(vec3f(
      s - 1 / pu.numStates,
      0.75,
      1 - step(1, 1 - s)
    )),
    pu.color
  );
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
  var s = 0;
  for (var i = 0; i < 6; i++) {
    var u = wrapGrid(h + nbrs[i]);
    var samp = sampleCell(u);
    s += i32(step(1, samp)) << u32(i);
  }

  var v = select(
    cur - 1,
    cur + 1,
    s == (1 | 2) ||
    s == (2 | 4) ||
    s == (4 | 8) ||
    s == (8 | 16) ||
    s == (16 | 32) ||
    s == (32 | 1) ||

    s == (1 | 8) ||
    s == (2 | 16) ||
    s == (4 | 32) ||

    s == (1 | 2 | 8 | 16) ||
    s == (2 | 4 | 16 | 32) ||
    s == (4 | 8 | 32 | 1) ||
    false,
  );

  v = max(0, v);
  v = m1(v, pu.numStates);
  v = select(v, cur, gu.time == 0);
  // v = cur;
  output[p.x * u32(size) + p.y] = v;
}