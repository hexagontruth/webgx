struct VertexData {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) cv : vec2f,
};

struct FancyStruct {
  color: vec4f,
  scale: vec2f,
  offset: vec2f,
};

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexData
{
  var output : VertexData;
  output.position = position;
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  return output;
}

@group(0) @binding(0) var<uniform> fancyStruct: FancyStruct;

@group(0) @binding(1) var stream : texture_2d<f32>;

@group(0) @binding(2) var samp : sampler;

fn rgb2hsv(c: vec4f) -> vec4f
{
    var K = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    var p = mix(vec4f(c.bg, K.wz), vec4f(c.gb, K.xy), step(c.b, c.g));
    var q = mix(vec4f(p.xyw, c.r), vec4f(c.r, p.yzx), step(p.x, c.r));

    var d = q.x - min(q.w, q.y);
    var e = 1.0e-10;
    return vec4f(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x, c.w);
}

fn hsv2rgb(c: vec4f) -> vec4f
{
    var K = vec4f(1., 2. / 3., 1. / 3., 3.);
    var p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return vec4f(c.z * mix(K.xxx, clamp(p - K.xxx, vec3f(0.0), vec3f(1.0)), c.y), c.w);
}

fn roundCubic(p: vec3f) -> vec3f {
  var r = round(p);
  var d = abs(r - p);
  if (d.x > d.y && d.x > d.z) {
    r.x = -r.y - r.z;
  }
  else if (d.y > d.z) {
    r.y = -r.x - r.z;
  }
  else {
    r.z = -r.x - r.y;
  }
  return r;
}

// @location(1) var tau = 6.283185307179586;
// @location(2) var sr2 = 1.4142135623730951;
// @location(3) var sr3 = 1.7320508075688772;
// @location(4) var ir3 = 0.5773502691896257;

//  fn hex2cart() -> mat3x2<f32> {
//   return mat3x2<f32>(
//     vec2(0, 0),
//     vec2(1, 0),
//     vec2(0.5, 1.7320508 / 2.)
//     );
//  };
 
//  fn cart2hex() -> mat2x3<f32> {
//   return mat2x3<f32>(
//     vec3(-1, 1, 0),
//     vec3(-1. / 1.7320508, -1. / 1.7320508, 2. / 1.7320508)
//   );
//  };

fn cart2hex(c: vec2f) -> vec3f {
  var sr3 = 1.732;
  var hex : vec3f;
  hex.y = (c.x - c.y * 1. / sr3);
  hex.z =  c.y * 2. / sr3;
  hex.x = -hex.z - hex.y;
  return hex;
}

fn hex2cart(c: vec3f) -> vec2f {
  var sr3 = 1.732;
  var cart = vec2f(
    c.y + 0.5 * c.z,
    sr3 / 2. * c.z
  );
  return cart;
}

//  var hex2hex = mat3<f32>(
//     1./3.,        1./3. - ir3,  1./3. + ir3,
//     1./3. + ir3,  1./3.,        1./3. - ir3,
//     1./3. - ir3,  1./3. + ir3,  1./3.
// );

fn modf(n : vec2f, m : vec2f) -> vec2f {
  return n % m;
}
fn hexbin(bv: vec2f, s: f32) -> vec4f {
  var sr3 = 1.73205;
  var res = s / 3.;
  var cv : vec2f;
  var dv : vec2f;
  cv = bv;
  cv *= res;

  var r = vec2f(1., 1. / sr3);
  r = vec2f(r.y, r.x);
  var h = r * 0.5;
  
  var a = modf(cv, r) - h;
  var b = modf(cv - h, r) - h;

  var delta = length  (a) - length  (b);
  dv = select(b, a, delta < 0);

  a = modf(bv, r) - h;
  b = modf(bv - h, r) - h;
  var coord = select(b, a, length(a) < length(b));
  coord = (cv - dv) / res;
  dv *= 3.;
  return vec4f(dv, coord);
}

fn amax(v: vec3f) -> f32 {
  var a = abs(v);
  return max(max(a.x, a.y), a.z);
}

const x = 5.;

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  // return vec4f(fragData.uv.xy, 0, 1);
  // return vec4f(floor(data.uv.xy * 12)/12, 0, 1);
  var c : vec4f;
  var cv = data.cv;
  var uv = data.uv;
  // uv = data.position.xy/1024;
  // uv = cv * 0.5 + 0.5;
  var hex = cart2hex(cv);
  var r = step(0.75, amax(hex));

  var s = textureSample(stream, samp, uv);
  c = s;
  // c.y = textureSample(stream, samp, uv.xy).y;

  c = rgb2hsv(c);
  // c.x += fancyStruct.color.x/60.;
  // // c.g = clamp(c.g, 0, .75);
  // // c.z = clamp(c.b, 0, 5./6.);

  // c.g += floor(uv.y * 10.)/10.;
  // c.g = 0.5;
  // c.g = fract(c.g);
  // c.b = 1;
  c = hsv2rgb(c);
  c = clamp(c, vec4f(0), vec4f(1));
  // c.x = cv.x;
  // c.y = cv.y;

  // color = vec4f(hex/10, 1)/10;
  return vec4f(c.rgb, 1);
}