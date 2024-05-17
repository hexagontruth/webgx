#include /common/partials/std-header-vertex

struct ProgramUniforms {
  step: f32,
  cellDim: f32,
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

fn wrapGridTo(p: vec3i, radius: f32) -> vec3i {
  // There is a more efficient way to do this
  var u = vec3f(p);

  if (amax3(u) > radius) {
    u = hex2hex * u;
    u = u / radius / sr3;
    u = getCubic(u);
    u = u * radius * sr3;
    u = transpose(hex2hex) * u;
    // Fix fp rounding errors
    u = roundCubic(u);
  }

  // We need to map all edge and corner cells to canonical coordinates
  if (isCorner(u, radius) && u.z != radius) {
    u = u.yzx;
    if (u.z != radius) {
      u = u.yzx;
    }
  }
  else if (amax3(u) == radius && u.z < 0) {
    u = -u;
    u = select(
      select(
        u.yxz,
        u.zyx,
        u.y == -radius,
      ),
      u.xzy,
      u.x == -radius,
    );
  }
  return vec3i(u);
}

fn wrapGrid(p: vec3i) -> vec3i {
  return wrapGridTo(p, pu.gridRadius);
}

fn wrapGridf(p: vec3f, radius: f32) -> vec3f {
  return vec3f(wrapGridTo(vec3i(round(p)), radius));
}

fn isCorner(p: vec3f, radius: f32) -> bool {
  return max3(p) == radius && min3(p) == -radius;
}

fn isWrapped(u: vec3i, v: vec3i) -> bool {
  return sum3(abs(vec3f(u - v))) != 0;
}

fn toHex(p: vec2u) -> vec3i {
  var cellDim = i32(pu.cellDim);
  var u = vec3i(vec2i(p), 0) - cellDim / 2;
  u.z = -u.x - u.y;
  return u;
}

fn fromHex(p: vec3i) -> vec2u {
  var cellDim = i32(pu.cellDim);
  var u = p.xy;
  u = u + cellDim / 2;
  return vec2u(u);
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
      var u = wrapGridf(p[j].xyz, octave);
      s += tsin3(u * r + dist[j] * 1 + r) * dist[j];
    }
    n += s / octave;
  }
  return tsin1(sum3(n) / 3.) * pow(2, pu.noiseMagnitude);
}

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var hex = cart2hex * (data.cv * gu.cover);
  var h = hex * pu.scale;
  h = wrapCubic(h);
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
    var coord = wrapGrid(vec3i(u));
    var samp = sampleCell(coord).xyz;
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
  var uv = data.cv * gu.cover * 0.5 + 0.5;
  var gridScale = 2 / amin2(gu.size) * pu.cellDim;

  var p = vec2u(floor(uv * pu.cellDim));
  var offset = (p.x  * u32(pu.cellDim) + p.y) * 4;

  var s = vec4f(input[offset], input[offset + 1], input[offset + 2], input[offset + 3]);

  var c = s.xyz;
  c += amax2(qwp2(uv * pu.cellDim, gridScale / 4, gridScale)) * pu.showGrid;
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
  var cur = sampleCell(hRaw);
  var radius = amax3i(h);
  var next = cur;
  var n = unit.yyyy;

  if (isWrapped(h, hRaw)) {
    writeCell(p, unit.yyyy);
    // writeCell(p, next);
    return;
  }

  if (pu.step == 0) {
    if (pu.noiseSeed > 0) {
      next.x += computeNoise(h);
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
    var u = h + nbrs[i];

    var isEdge = step(pu.gridRadius + 1, amax3(vec3f(u)));
    var wrapCoef = 1.;
    wrapCoef = mix(1, pu.wrap, isEdge);

    u = wrapGrid(u);

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
