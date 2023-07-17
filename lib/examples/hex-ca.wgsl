#include /common/partials/std-header-vertex
#include /common/partials/filters
#include /common/partials/test

struct ProgramUniforms {
  size: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

const nbrs = array(
  vec2i(-1, -1),
  vec2i(0, -1),
  vec2i(1, 0),
  vec2i(1, 1),
  vec2i(0, 1),
  vec2i(-1, 0),
);

fn sampleCell(p: vec2u) -> f32 {
  return input[p.x * u32(pu.size) + p.y];
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  // TBD
  return vec4f(unit.yyy, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var p = vec2u((data.cv * gu.cover * 0.5 + 0.5) * pu.size);
  var s = sampleCell(p);
  var c = vec3f(s/3.);
  return vec4f(c, 1);
}

@compute @workgroup_size(16, 16)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var size = i32(pu.size);
  var p = vec2u(
    globalIdx.x,
    globalIdx.y,
  );
  var cur = sampleCell(p);
  var s = 0;
  for (var i = 0; i < 6; i++) {
    var u = vec2i(p) + nbrs[i];
    u = (u + size) % size;
    var samp = sampleCell(vec2u(u));
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
  v = m1(v, 3);
  output[p.x * u32(size) + p.y] = v;
}
