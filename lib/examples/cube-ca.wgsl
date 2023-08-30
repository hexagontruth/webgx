#include /common/partials/std-header-vertex
#param WORKGROUP_SIZE 4

struct ProgramUniforms {
  bufferDim: f32,
  bufferSize: f32,
  numStates: f32,
  displayMin: f32,
  sizeMax: f32,
  rotX: f32,
  rotY: f32,
  rotZ: f32,
};

struct CubeVertexData {
  @builtin(position) position : vec4f,
  @location(0) p: vec3f,
  @location(1) n: vec3f,
  @location(2) cell: vec3f,
  @location(3) color: vec3f,
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

fn fromCube(p: vec3i) -> i32 {
  var dim = i32(pu.bufferDim);
  var v = (p + dim) % dim;
  var idx = v.x * dim * dim + v.y * dim + v.z;
  return idx;
}

fn toCube(idx: i32) -> vec3i {
  var dim = i32(pu.bufferDim);
  var p : vec3i;
  p.x = idx / dim / dim;
  p.y = (idx / dim) % dim;
  p.z = idx % dim;
  return p;
}

fn sampleCell(p: vec3i) -> f32 {
  var idx = fromCube(p);
  return input[idx];
}

@vertex
fn vertexCube(
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
  @builtin(vertex_index) vertIdx: u32,
  @builtin(instance_index) instIdx: u32
) -> CubeVertexData {
  var output : CubeVertexData;

  var cell = toCube(i32(instIdx));
  var state = sampleCell(cell);

  output.p = position.xyz;
  output.n = normal.xyz;
  output.cell = vec3f(cell);

  var cellPos = output.cell / pu.bufferDim;

  output.color = (position.xyz + cellPos) / 2;

  output.p = output.p / pu.bufferDim * 2;
  output.p *= clamp(state - pu.displayMin, 0, pu.sizeMax);
  output.p += cellPos * 2 - 1;
  output.p /= sr3;

  var rot = id3;
  rot = trot3m(rot, unit.xyy, gu.totalTime * pu.rotX);
  rot = trot3m(rot, unit.yxy, gu.totalTime * pu.rotY);
  rot = trot3m(rot, unit.yyx, gu.totalTime * pu.rotZ);

  output.p = stdCubic * rot *  output.p;
  output.n = rot * output.n;

  var vertPos = output.p * unit.xxz;
  vertPos.z = vertPos.z * 0.25 + 0.5;
  output.position = vec4f(vertPos, 1);
  return output;
}

@fragment
fn fragmentBackground(data: VertexData) -> @location(0) vec4f {
  return unit.yyyx;
}

@fragment
fn fragmentMain(data: CubeVertexData) -> @location(0) vec4f {
  var dx = max(0, dot(data.n, unit.xyy));
  var dy = max(0, dot(data.n, unit.yxy));
  var dz = max(0, dot(data.n, unit.yyx));

  var c = data.color;
  var l = dz * 1 + dx * 0.5 + dy * 0.25;

  c = rgb2hsv3(c);
  c.x += length(data.p * 2);
  c.z = 1;

  c.y = select(
    1.,
    0.,
    amin3(data.cell) == 0 || amax3(data.cell) == pu.bufferDim - 1
  );

  c = hsv2rgb3(c);
  c *= l;
  c *= htWhite;

  return vec4f(c, 1);
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

@compute @workgroup_size($WORKGROUP_SIZE, $WORKGROUP_SIZE, $WORKGROUP_SIZE)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var p = vec3i(globalIdx.xyz);
  var cur = sampleCell(p);
  // var s = 0;
  // var e = 0;
  // var c = 0;
  var ss = 0.;
  // var es = 0.;
  // var cs = 0.;
  var v : f32;
  for (var i = 0; i < 6; i++) {
    var samp = sampleCell(p + sides[i]);
    // s += i32(step(1, samp)) << u32(i);
    ss += step(1, samp);
  }
  // for (var i = 0; i < 12; i++) {
  //   var samp = sampleCell(p + edges[i]);
  //   // e += i32(step(1, samp)) << u32(i);
  //   es += samp;
  // }
  // for (var i = 0; i < 8; i++) {
  //   var samp = sampleCell(p + corners[i]);
  //   // c += i32(step(1, samp)) << u32(i);
  //   cs += samp;
  // }
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

  var cond = ss == 1 && cur == 0;
  v = f32(select(max(0, cur - 1), pu.numStates, cond));
  output[fromCube(p)] = select(cur, v, gu.time > 0);
}
