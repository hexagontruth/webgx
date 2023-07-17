#include /common/partials/std-header-vertex
#include /common/partials/filters
#include /common/partials/test

struct ProgramUniforms {
  size: f32,
  showTest: f32,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input: array<f32>;
@group(2) @binding(1) var<storage, read_write> output: array<f32>;

fn sampleCell(p: vec2u) -> f32 {
  return input[p.x * u32(pu.size) + p.y];
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var p = vec2u((data.cv * gu.cover * 0.5 + 0.5) * pu.size);
  var s = mix(unit.yyy, testPattern(data.uv).rgb, pu.showTest);
  var v = sampleCell(p);
  var c = xsum3(s, vec3f(v));

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
  var s = 0.;
  for (var i = -1; i < 2; i++) {
    for (var j = -1; j < 2; j++) {
      // if (amax2(vec2f(vec2i(i, j))) == 0) { continue; }
      var u = vec2i(p) + vec2i(i, j);
      u = (u + size) % size;
      s += sampleCell(vec2u(u));
    }
  }
  s = s - cur;
  var v = select(0., 1., s == 3. || (s == 2. && cur == 1.));
  output[p.x * u32(size) + p.y] = v;
}
