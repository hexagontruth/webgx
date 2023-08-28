#include /common/partials/std-header-vertex

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
  @location(1) normal: vec4f,
  @location(2) cell: vec3f,
  @location(3) color: vec3f,
  @location(4) uv : vec2f,
  @location(5) cv : vec2f,
  @location(6) v: vec3f,
  @location(7) lv: vec3f,
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

fn phong(
  d: vec3f,
  p: vec3f,
  n: vec3f,
  lightPos: vec3f,
  aColor: vec3f,
  dColor: vec3f,
  sColor: vec3f,
  s: f32
) -> vec3f {
    var light = normalize(lightPos - d);
    var view = normalize(d - p);

    var rf = normalize(reflect(light, n));
    var dif = dColor * max(dot(light, n), 0);
    var spec = sColor * pow(max(dot(view, rf), 0), s,);

    return aColor + dif + spec;
}

@vertex
fn vertexCube(
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
  @builtin(vertex_index) vertIdx: u32,
  @builtin(instance_index) instIdx: u32
) -> CubeVertexData {
  var output : CubeVertexData;
  output.color = position.xyz;
  var pos = position.xyz;
  var n = normal.xyz;
  var cube = toCube(i32(instIdx));
  var state = sampleCell(cube);
  output.cell = vec3f(cube);
  var cubePos = output.cell / pu.bufferDim;
  output.color = (output.color + cubePos) / 2;
  cubePos = cubePos * 2 - 1;

  output.lv = pos.xyz * 0.5 + 0.5;
  pos /= pu.bufferDim;
  pos *= 2;
  pos *= clamp(state - pu.displayMin, 0, pu.sizeMax);

  pos += cubePos;
  pos /= sr3;

  var rot = trot3m(id3, unit.yxy, 0.125);
  rot = rot3m(rot, unit.xyy, 0.61548);
  var uniformRot = normalize(vec3f(pu.rotX, pu.rotY, pu.rotZ)) * unit.zzx;
  if (amax3(uniformRot) > 0) {
    rot = trot3m(rot, uniformRot, gu.time);
  }

  pos = rot * pos;
  n = rot * n;

  pos.z = pos.z * 0.25 + 0.5;

  output.position = vec4f(pos, 1);
  output.normal = vec4f(n, 1);
  output.cv = pos.xy;
  output.v = pos.xyz;
  output.uv = output.cv * 0.5 + 0.5;
  return output;
}

@fragment
fn fragmentBackground(data: VertexData) -> @location(0) vec4f {
  return unit.yyyx;
}

@fragment
fn fragmentMain(data: CubeVertexData) -> @location(0) vec4f {
  var d = dot(data.normal, normalize(unit.yxzy));
  var sd = dot(data.normal, normalize(unit.xxzy));

  d = abs(d) * 1;
  sd = sd * sd * sd;
  sd = clamp(sd/1, 0., 1.);
  var c = data.color;

  c = c * d;
  c = rgb2hsv3(c);
  c.x += length(data.v * 2);
  c.y = max(0.25, c.y);// + sd;
  c.z = max(0.25, c.z) + sd;

  var cmax = amax3(data.cell);
  var cmin = amin3(data.cell);
  c.y = select(c.y, 0, cmin == 0 || cmax == pu.bufferDim - 1);
  c = hsv2rgb3(c);
  c *= 1.1;

  var ambient = htWhite * 0.25;
  var diffuse = data.normal.xyz * 0.75;
  var specFact = pow(2, 6);
  var spec = mix(diffuse, unit.xxx, specFact/1024);

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

@compute @workgroup_size(4, 4, 4)
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
  var es = 0.;
  var cs = 0.;
  var v : f32;
  for (var i = 0; i < 6; i++) {
    var samp = sampleCell(p + sides[i]);
    // s += i32(step(1, samp)) << u32(i);
    ss += step(1, samp);
  }
  for (var i = 0; i < 12; i++) {
    var samp = sampleCell(p + edges[i]);
    // e += i32(step(1, samp)) << u32(i);
    es += samp;
  }
  for (var i = 0; i < 8; i++) {
    var samp = sampleCell(p + corners[i]);
    // c += i32(step(1, samp)) << u32(i);
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
  var cond = ss == 1 && cur == 0;
  v = f32(select(max(0, cur - 1), pu.numStates, cond));
  output[fromCube(p)] = select(cur, v, gu.time > 0);
}
