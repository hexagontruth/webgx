#include /common/partials/std-header-vertex

struct ProgramUniforms {
  step: f32,
  cellDim: f32,
  gridRadius: f32,
  scale: f32,
  wrap: f32,
  pulse: f32,
  pulseMinRadius: f32,
  pulseMaxRadius: f32,
  pulseFrequency: f32,
  pulseMagnitude: f32,
  noiseSeed: f32,
  noiseDepth: f32,
  noiseMagnitude: f32,
  centerSeed: f32,
  centerRadius: f32,
  centerMagnitude: f32,
  edgeSeed: f32,
  edgeRadius: f32,
  edgeMagnitude: f32,
  randomSeed: vec2f,
  waveCoef: vec3f,
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
  u = u / pu.gridRadius / sr3;
  u = getCubic(u);
  u = u * pu.gridRadius * sr3;
  u = transpose(hex2hex) * u;
  u = roundCubic(u);
  return vec3i(u);
}

fn toHex(p: vec2u) -> vec3i {
  var cellDim = i32(pu.cellDim);
  var pi = vec2i(p) - cellDim / 2;
  var u = vec3i(pi, -pi.x - pi.y);
  return u;
}

fn fromHex(p: vec3i) -> vec2u {
  var cellDim = i32(pu.cellDim);
  var u = p;
  u = u + cellDim / 2;
  return vec2u(u.xy);
}

fn sampleCell(h: vec3i) -> vec4f {
  var p = fromHex(h);
  var offset = (p.x * u32(pu.cellDim) + p.y) * 4;
  return vec4f(
    input[offset],
    input[offset + 1],
    input[offset + 2],
    input[offset + 3],
  );
}

fn writeCell(p: vec2u, v: vec4f) {
  var offset = (p.x * u32(pu.cellDim) + p.y) * 4;
  output[offset] = v.x;
  output[offset + 1] = v.y;
  output[offset + 2] = v.z;
  output[offset + 3] = v.w;
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  // return vec4f(1,1,0,1);
  // return hsv2rgb(vec4(pu.step / 6, 1, 1, 1));
  var hex = cart2hex * (data.cv * gu.cover);
  var h = hex * pu.scale;
  h = wrapCubic(h);
  h = h * pu.gridRadius;
  var p = interpolatedCubic(h);
  var c = unit.yyy;
  for (var i = 0; i < 3; i++) {
    var u = p[i].xyz;
    var dist = p[i].w;
    var s = sampleCell(vec3i(u));
    c += vec3f(
      s.x/3-1/6.,
      1 - abs(s.y),
      (abs(s.x)) * 2.,
    ) * dist;
  }
  // c.x -= pu.step / 720;
  c = hsv2rgb3(c);
  c *= htWhite;
  // c = sampleCell(vec3i(p[0].xyz)).xyz;
  // c = hsv2rgb3(vec3(c.x/6, 1, c.x*2));
  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var p = vec2u(round((data.cv * gu.cover * 0.5 + 0.5) * pu.cellDim));
  var offset = (p.x * u32(pu.cellDim) + p.y) * 4;
  var s = vec4f(input[offset], input[offset + 1], input[offset + 2], input[offset + 3]);
  var c = s.xyz;
  return vec4f(c, 1);
}

@compute @workgroup_size(16, 16)
fn computeMain(
  @builtin(global_invocation_id) globalIdx : vec3u,
  // @builtin(workgroup_id) workgroupIdx : vec3u,
  // @builtin(local_invocation_id) localIdx : vec3u
) {
  var size = i32(pu.cellDim);
  var p = globalIdx.xy;
  var hRaw = toHex(p);
  var h = wrapGrid(hRaw);
  var cur = sampleCell(h);
  var radius = amax3i(hRaw);
  var next = cur;
  var n = unit.yyyy;

  // writeCell(p, vec4f(100, 100, 100, 100));
  // return;

  if (radius > i32(pu.gridRadius)) {
    writeCell(p, unit.yyyy);
    return;
  }
  else if (pu.step == 0) {
    if (pu.centerSeed > 0 && radius <= i32(pu.centerRadius)) {
      next = unit.xyyy * pow(2, pu.centerMagnitude);
    }
    if (pu.edgeSeed > 0 && radius > i32(pu.gridRadius - pu.edgeRadius)) {
      next = unit.xyyy * pow(2, pu.edgeMagnitude);
    }
    writeCell(p, next);
    return;
  }

  for (var i = 0; i < 6; i++) {
    var u = wrapGrid(h + nbrs[i]);

    // var isEdge = step(pu.gridRadius, amax3(vec3f(hRaw + nbrs[i])));
    var isEdge = step(pu.gridRadius, amax3(vec3f(u)));
    var wrapCoef = 1.;
    wrapCoef = mix(1, pu.wrap, isEdge);

    var samp = sampleCell(u);
    n += samp * wrapCoef;
  }

  var coef = pu.waveCoef;
  var pulseCoef = pu.pulse;
  pulseCoef *= step(pu.pulseMinRadius, f32(radius));
  pulseCoef *= (1 - step(pu.pulseMaxRadius, f32(radius)));

  // n.x = n.x - pow(2, -10) * mix(-1, 1, step(0, n.x));
  var a = (n.x - cur.x * 6) * coef.x;
  var v = (cur.y + a) * coef.y;
  var s = (cur.x + v) * coef.z;
  s = s + tsin1(pu.step / pu.pulseFrequency) * pow(2, pu.pulseMagnitude) * pulseCoef;

  next = vec4f(s, v, a, cur.x);
  writeCell(p, next);
}
