#include /common/partials/std-header-vertex

struct ProgramUniforms {
  step: f32,
  maxRadius: f32,
  gridRadius: f32,
  wrap: f32,
  scale: f32,
  interpolateCells: f32,
  showGrid: f32,
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
  randomSeed: vec4f,
  waveCoef: vec3f,
};

@group(1) @binding(0) var<uniform> pu : ProgramUniforms;

@group(2) @binding(0) var<storage, read> input0: array<u32>;
@group(2) @binding(1) var<storage, read> input1: array<u32>;
@group(2) @binding(2) var<storage, read_write> output0: array<u32>;
@group(2) @binding(3) var<storage, read_write> output1: array<u32>;

const nbrs = array(
  vec3i( 1,  0, -1),
  vec3i( 0,  1, -1),
  vec3i(-1,  1,  0),
  vec3i(-1,  0,  1),
  vec3i( 0, -1,  1),
  vec3i( 1, -1,  0),

  vec3i( 2, -1, -1),
  vec3i( 1,  1, -2),
  vec3i(-1,  2, -1),
  vec3i(-2,  1,  1),
  vec3i(-1, -1,  2),
  vec3i( 1, -2,  1),

  vec3i( 2,  0, -2),
  vec3i( 0,  2, -2),
  vec3i(-2,  2,  0),
  vec3i(-2,  0,  2),
  vec3i( 0, -2,  2),
  vec3i( 2, -2,  0),
);

fn readCell(idx: i32) -> vec4f {
  return vec4f(
    vec2f(unpack2x16float(input0[idx])),
    vec2f(unpack2x16float(input1[idx])),
  );
}

fn writeCell(idx: i32, v: vec4f) {
  output0[idx] = pack2x16float(v.xy);
  output1[idx] = pack2x16float(v.zw);
}

fn readCellHex(p: vec3i) -> vec4f {
  var r = i32(pu.maxRadius);
  return readCell(hexToBufferIdx(p, r));
}

fn computeNoise(p: vec3i) -> f32 {
  var h = vec3f(p) / pu.gridRadius;
  var r = pu.randomSeed.xyz;
  var n = unit.yyy;
  var li = 0.;
  for (var i = 0.; i < pu.noiseDepth; i += 1) {
    var octave = pow(2, i + 1);
    var p = interpolatedCubic(h * octave + epsilonHex);
    var dist = vec3f(p[0].w, p[1].w, p[2].w);
    var s = unit.yyy;

    for (var j = 0; j < 3; j++) {
      var u = vec3f(wrapGridUnique(vec3i(p[j].xyz), octave));
      s += tsin3(u * r + dist[j] * 1 + r) * dist[j];
    }
    n += s / octave;
  }
  return tsin1(sum3(n) / 3.) * pow(2, pu.noiseMagnitude);
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var hex = cart2hex * (data.cv * gu.cover);
  var h = wrapCubic(hex * pu.scale, 1);
  h = h * pu.gridRadius;
  var s : array<vec3f, 3>;
  var c = unit.yyy;
  var dist = unit.yyy;

  var p = interpolatedCubic(h);
  var interpCount = 1 + i32(pu.interpolateCells) * 2;
  var gridDist = amax3(hex2hex * getCubic(h)) * sr3;
  var gridScale = 4 / amin2(gu.size) * pu.gridRadius * 2 * pu.scale / ap;

  for (var i = 0; i < interpCount; i++) {
    var u = p[i].xyz;
    var coord = wrapGridUnique(vec3i(u), pu.gridRadius);
    var samp = readCellHex(coord).xyz;
    s[i] = vec3f(
      samp.x/3-1/6.,
      1 - abs(samp.y),
      (abs(samp.x)) * 2.,
    );
    dist[i] = p[i].w;
  }
  c = s[0] * dist.x + s[1] * dist.y + s[2] * dist.z;
  c = select(c, s[0], interpCount == 1);

  c = hsv2rgb3(c);
  c += qw1(1 - gridDist, gridScale / 4, gridScale) * pu.showGrid * 0.25;
  c *= htWhite;

  // c = p[0].xyz/pu.gridRadius;

  return vec4f(c, 1);
}

@fragment
fn fragmentTest(data: VertexData) -> @location(0) vec4f {
  var r = i32(pu.maxRadius);
  var p = vec2i((data.cv * gu.cover) * pu.maxRadius);
  var bufferIdx = hexToBufferIdx(vec3i(p, -p.x -p.y), r);
  var s = readCell(bufferIdx);
  var c = s.xyz;
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

  var cur = readCell(bufferIdx);
  var radius = amax3(vec3f(h));
  var next = cur;
  var n = unit.yyyy;

  if (pu.step == 0) {
    if (pu.noiseSeed > 0) {
      next.x += computeNoise(h);
    }
    if (pu.centerSeed > 0 && radius <= pu.centerRadius) {
      next += unit.xyyy * pow(2, pu.centerMagnitude);
    }
    if (pu.edgeSeed > 0 && radius > pu.gridRadius - pu.edgeRadius) {
      next += unit.xyyy * pow(2, pu.edgeMagnitude);
    }
    writeCell(bufferIdx, next);
    return;
  }

  for (var i = 0; i < 6; i++) {
    var u = h + nbrs[i];

    var isEdge = step(pu.gridRadius + 1, amax3(vec3f(u)));
    var wrapCoef = 1.;
    wrapCoef = mix(1, pu.wrap, isEdge);

    u = wrapGridUnique(u, pu.gridRadius);

    var samp = readCellHex(u);
    n += samp * wrapCoef;
  }

  var coef = pu.waveCoef;
  var pulseCoef = pu.pulse;
  pulseCoef *= step(pu.pulseMinRadius, radius);
  pulseCoef *= (1 - step(pu.pulseMaxRadius, radius));

  var a = (n.x - cur.x * 6) * coef.x;
  var v = (cur.y + a) * coef.y;
  var s = (cur.x + v) * coef.z;
  s = s + tsin1(pu.step / pu.pulseFrequency) * pow(2, pu.pulseMagnitude) * pulseCoef;

  next = vec4f(s, v, a, 0);
  writeCell(bufferIdx, next);
}
