#include /common/partials/std-header-vertex

struct ProgramUniforms {
  maxRadius: f32,
  gridRadius: f32,
  scale: f32,
  numStates: f32,
  colorDisplay: f32,
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

fn sampleCell(h: vec3i) -> f32 {
  var p = hexToBufferIdx(h, i32(pu.maxRadius));
  return input[p];
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

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var hex = cart2hex * (data.cv * gu.cover);
  var h = wrapCubic(hex * pu.scale, 1);
  h = roundCubic(h * pu.gridRadius);
  var v = wrapGridUnique(vec3i(h), pu.gridRadius);
  var s = sampleCell(v);
  var c = colorMix(s);
  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var r = i32(pu.maxRadius);
  var p = vec2i((data.cv * gu.cover) * pu.maxRadius);
  var bufferIdx = hexToBufferIdx(vec3i(p, -p.x -p.y), r);
  var s = input[bufferIdx];
  var c = colorMix(s);
  return vec4f(c, 1);
}

@compute @workgroup_size(16, 16)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var r = i32(pu.maxRadius);
  var bufferIdx = globalIdxToBufferIdx(globalIdx, r);
  var p = bufferIdxToHex(bufferIdx, r);
  var h = wrapGridUnique(p, pu.gridRadius);

  if (isWrapped(h, p)) {
    return;
  }

  var cur = input[bufferIdx];
  var s = 0;
  for (var i = 0; i < 6; i++) {
    var u = wrapGridUnique(h + nbrs[i], pu.gridRadius);
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
  v = select(v, cur, gu.counter == 0);
  // v = cur;
  output[bufferIdx] = v;
}
