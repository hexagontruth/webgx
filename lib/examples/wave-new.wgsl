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
  // There is a more efficient way to do this
  var u = vec3f(p);

  if (amax3(u) > pu.gridRadius) {
    u = hex2hex * u;
    u = u / pu.gridRadius / sr3;
    u = getCubic(u);
    u = u * pu.gridRadius * sr3;
    u = transpose(hex2hex) * u;
    // Fix fp rounding errors
    u = roundCubic(u);
  }

  // We need to map all edge and corner cells to canonical coordinates
  if (isCorner(vec3i(u))) {
    u = u.yzx;
    if (u.z != pu.gridRadius) {
      u = u.yzx;
    }
  }
  else if (amax3(u) == pu.gridRadius && u.z < 0) {
    u = -u;
  }
  return vec3i(u);
}

fn isCorner(p: vec3i) -> bool {
  var u = vec3f(p);
  return amax3(u) + amin3(u) + pu.gridRadius == sum3(abs(u));
}

fn isWrapped(u: vec3i, v: vec3i) -> bool {
  return sum3(abs(vec3f(u - v))) != 0;
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

fn computeNoise(hex: vec3i) -> vec4f {
  var h = vec3f(hex);
  if (amax3(h) >= pu.gridRadius) {
    return vec4f(0, 0, 0, 0);
  }
  var r = pu.randomSeed;
  var t = 0.;
  let octaves = log2(pu.gridRadius);
  for (var i = 0.; i < octaves; i += 1) {
    h = h / 2;
    var n = interpolatedCubic(h);
    var s = 0.;
    for (var j = 0; j < 3; j++) {
      let nbr = vec3f(wrapGrid(vec3i(n[j].xyz)));
      var u = hex2cart * nbr.xyz;
      var v = vec2f(
        cos((r.x + u.x) * 256),
        sin((r.y + u.y) * 256),
      );
      s += sum2(v) * n[j].w;
    }
    t += s * pow(2., -octaves + i);
  }
  return vec4f(t, 0, 0, 0);
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
  for (var i = 0; i < 1; i++) {
    var u = p[i].xyz;
    var dist = p[i].w;
    var coord = wrapGrid(vec3i(u));
    var s = sampleCell(coord);
    c += vec3f(
      s.x/3-1/6.,
      1 - abs(s.y),
      (abs(s.x)) * 2.,
    ) * 1;
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
  var p = vec2u(floor((data.cv * gu.cover * 0.5 + 0.5) * pu.cellDim));
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
  var radius = amax3i(h);
  var next = cur;
  var n = unit.yyyy;

  if (isWrapped(h, hRaw)) {
    writeCell(p, unit.yyyy);
    return;
  }

  if (pu.step == 0) {
    if (pu.noiseSeed > 0) {
      next += computeNoise(h);
    }
    if (pu.centerSeed > 0 && radius <= i32(pu.centerRadius)) {
      next += unit.xyyy * pow(2, pu.centerMagnitude);
    }
    if (pu.edgeSeed > 0 && radius > i32(pu.gridRadius - pu.edgeRadius)) {
      next += unit.xyyy * pow(2, pu.edgeMagnitude);
    }
    writeCell(p, next);
    return;
  }

  for (var i = 0; i < 6; i++) {
    var u = wrapGrid(h + nbrs[i]);

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

  var a = (n.x - cur.x * 6) * coef.x;
  var v = (cur.y + a) * coef.y;
  var s = (cur.x + v) * coef.z;
  s = s + tsin1(pu.step / pu.pulseFrequency) * pow(2, pu.pulseMagnitude) * pulseCoef;

  next = vec4f(s, v, a, 0);
  writeCell(p, next);
}
