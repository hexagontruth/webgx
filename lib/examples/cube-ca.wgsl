#include /common/partials/std-header-vertex

struct ProgramUniforms {
  bufferDim: f32,
  numStates: f32,
  colorDisplay: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

const nbrs = array(
  vec3i(-1, -1, -1),
  vec3i(-1, -1,  0),
  vec3i(-1, -1,  1),
  vec3i(-1,  0, -1),
  vec3i(-1,  0,  0),
  vec3i(-1,  0,  1),
  vec3i(-1,  1, -1),
  vec3i(-1,  1,  0),
  vec3i(-1,  1,  1),

  vec3i(0, -1, -1),
  vec3i(0, -1,  0),
  vec3i(0, -1,  1),
  vec3i(0,  0, -1),
  vec3i(0,  0,  0),
  // vec3i(0,  0,  1),
  vec3i(0,  1, -1),
  vec3i(0,  1,  0),
  vec3i(0,  1,  1),

  vec3i(1, -1, -1),
  vec3i(1, -1,  0),
  vec3i(1, -1,  1),
  vec3i(1,  0, -1),
  vec3i(1,  0,  0),
  vec3i(1,  0,  1),
  vec3i(1,  1, -1),
  vec3i(1,  1,  0),
  vec3i(1,  1,  1),
);

fn wrapGrid(p: vec3u) -> vec3u {
  var dim = u32(pu.bufferDim);
  return (p + dim) % dim;
}

fn toCube(idx: u32) -> vec3u {
  var dim = u32(pu.bufferDim);
  var p : vec3u;
  p.x = idx / dim / dim;
  p.y = idx / dim;
  p.z = idx % dim;
  return p;
}

fn fromCube(p: vec3u) -> u32 {
  var dim = u32(pu.bufferDim);
  var idx = p.x * dim * dim + p.y * dim + p.z;
  return idx;
}

fn sampleCell(p: vec3u) -> f32 {
  var idx = fromCube(p);
  return input[idx];
}

fn colorMix(s: f32) -> vec3f {
  var c = mix(
    vec3f(
      2 / (1 + pow(e, -s / min(pu.numStates, 16) * 4)) - 1
    ),
    hsv2rgb3(vec3f(
      (s - 1) / pu.numStates,
      0.75,
      1 - step(1, 1 - s),
    )),
    pu.colorDisplay
  );
  c *= htWhite;
  return c;
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
  var nv = data.cv * gu.cover * 0.5 + 0.5;
  var v = nv * gu.size;
  // v = data.position.xy;
  var offset = v.y * gu.size.x + v.x;
  offset = offset % pow(pu.bufferDim, 3);
  var s = input[u32(offset)];
  var c = vec3f(s);
  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var nv = data.cv * gu.cover * 0.5 + 0.5;
  var v = nv * gu.size;
  var offset = v.x * gu.size.x + v.y;
  var s = input[u32(offset)];
  var c = colorMix(s);
  return vec4f(c, 1);
}

@compute @workgroup_size(4, 4, 4)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var dim = u32(pu.bufferDim);
  var p = globalIdx.xyz;
  var cur = sampleCell(p);
  var s = cur;
  var v : f32;
  for (var i = 0; i < 26; i++) {
    var u = wrapGrid(vec3u(vec3i(p) + nbrs[i]));
    var samp = sampleCell(u);
    // s += i32(step(1, samp)) << u32(i);
    s += samp;
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

  // v = max(0, v);
  // v = m1(v, pu.numStates);
  // v = select(v, cur, gu.counter == 0);
  v = f32(select(0, 1, s > 0 && s < 10));
  // v = cur + 0.1;
  // v = cur;
  output[fromCube(p)] = v;
}
