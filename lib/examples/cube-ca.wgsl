#include /common/partials/std-header-vertex

struct ProgramUniforms {
  bufferDim: f32,
  bufferSize: f32,
  numStates: f32,
  colorDisplay: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

const sides = array(
  vec3i(-1,  0,  0),
  vec3i(0, -1,  0),
  vec3i(0,  0, -1),
  vec3i(1,  0,  0),
  vec3i(0,  1,  0),
  vec3i(0,  0,  1),
);

const edges = array(
  vec3i(-1, -1,  0),
  vec3i(0,  -1, -1),
  vec3i(-1,  0, -1),

  vec3i(-1,  1,  0),
  vec3i(0,  -1,  1),
  vec3i(1,  0, -1),

  vec3i(1,   1,  0),
  vec3i(0,   1,  1),
  vec3i(1,   0,  1),

  vec3i(1,  -1,  0),
  vec3i(0,   1, -1),
  vec3i(-1,  0,  1),
);

const corners = array(
  vec3i(-1, -1, -1),
  vec3i(-1, -1,  1),
  vec3i(-1,  1, -1),
  vec3i(-1,  1,  1),
  vec3i(1,  -1, -1),
  vec3i(1,  -1,  1),
  vec3i(1,   1, -1),
  vec3i(1,   1,  1),
);

fn wrapGrid(p: vec3i) -> vec3i {
  // I don't know why this doesn't work
  var dim = i32(pu.bufferDim);
  return (p + dim) % dim;
}

fn fromCube(p: vec3i) -> i32 {
  var dim = i32(pu.bufferDim);
  var v = (p + dim) % dim;
  var idx = v.x * dim * dim + v.y * dim + v.z;
  return idx;
}

fn sampleCell(p: vec3i) -> f32 {
  var idx = fromCube(p);
  return input[idx];
}

@vertex
fn vertexCube(
  @location(0) position: vec4f,
  @builtin(vertex_index) vertIdx: u32,
  @builtin(instance_index) instIdx: u32
) -> VertexData {
  var output : VertexData;
  output.position = position;
  output.cv = position.xy;
  output.uv = output.cv * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var dim = 512.;
  var nv = data.uv;
  var v = floor(nv * dim) % 64;
  var w = floor((nv * dim) / 64);
  var offset = w.x * 64 * 64 * 8 + w.y * 64 * 64 +  v.x * 64 + v.y;
  var s = input[u32(offset)];
  return vec4f(vec3f(s) + vec3f(v/64., w.x/8) / 2, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var dim = 512.;
  var nv = data.uv;
  var v = floor(nv * dim) % 64;
  var w = floor((nv * dim) / 64);
  var offset = w.x * 64 * 64 * 8 + w.y * 64 * 64 +  v.x * 64 + v.y;
  var s = input[u32(offset)];
  return vec4f(vec3f(s) + vec3f(v/64., w.x/8) / 2, 1);
}

@compute @workgroup_size(4, 4, 4)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var p = vec3i(globalIdx.xyz);
  var cur = sampleCell(p);
  // var ntest = sampleCell(p + vec3i(0, 0, 1));
  // output[fromCube(p)] =ntest;
  // return;
  var s = 0;
  var e = 0;
  var c = 0;
  var ss = 0.;
  var es = 0.;
  var cs = 0.;
  var v : f32;
  for (var i = 0; i < 6; i++) {
    var samp = sampleCell(p + sides[i]);
    s += i32(step(1, samp)) << u32(i);
    ss += samp;
  }
  for (var i = 0; i < 12; i++) {
    var samp = sampleCell(p + edges[i]);
    e += i32(step(1, samp)) << u32(i);
    es += samp;
  }
  for (var i = 0; i < 8; i++) {
    var samp = sampleCell(p + corners[i]);
    c += i32(step(1, samp)) << u32(i);
    cs += samp;
  }
  // v = select(
  //   cur - 1,
  //   cur + 1,
  //   s == (1 | 2) ||
  //   s == (2 | 4) ||
  //   s == (4 | 8) ||
  //   s == (8 | 16) ||
  //   s == (16 | 32) ||
  //   s == (32 | 1) ||

  //   s == (1 | 8) ||
  //   s == (2 | 16) ||
  //   s == (4 | 32) ||

  //   s == (1 | 2 | 8 | 16) ||
  //   s == (2 | 4 | 16 | 32) ||
  //   s == (4 | 8 | 32 | 1) ||
  //   false,
  // );

  var d = es - ss;
  var cond = (cur == 0 && d > 0 && d < 3) || (cur > 0 && d == 2);
  cond = d == 1 || d == 2;
  v = f32(select(0, 1, cond));
  output[fromCube(p)] = select(cur, v, gu.time > 0);
}
