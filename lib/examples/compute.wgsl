#include /common/partials/std-header-vertex
#include /common/partials/filters
#include /common/partials/test

// struct ProgramUniforms {
//   opacity: f32,
//   invert: f32,
//   background: f32,
// };

// @group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read_write> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var s = testPattern(data.uv).rgb;
  var c = s;

  return vec4f(c, 1);
}

@compute @workgroup_size(4,4,4)
fn computeMain(@builtin(global_invocation_id) idx : vec3u) {

}