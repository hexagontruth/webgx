// These are mostly adapted from GLSL signed distance functions by Inigo Quilez:
// https://iquilezles.org/articles/distfunctions/

fn sdBox(p: vec3f, b: vec3f) -> f32 {
  var q = abs(p) - b;
  return length(max(q, unit.yyy)) + min(max3(q), 0);
}

fn sdBoxFrame(p: vec3f, b: vec3f, e: f32) -> f32 {
  var v = abs(p) - b;
  var q = abs(v + e) - e;
  var pq = array(
    vec3f(v.x, q.y, q.z),
    vec3f(q.x, v.y, q.z),
    vec3f(q.x, q.y, v.z),
  );
  return min3(vec3f(
    length(max(pq[0], unit.yyy)) + min(max3(pq[0]), 0),
    length(max(pq[1], unit.yyy)) + min(max3(pq[1]), 0),
    length(max(pq[2], unit.yyy)) + min(max3(pq[2]), 0),
  ));
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
  var q = vec2f(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}

fn sdLongTorus(p: vec3f, t: vec2f, r: f32) -> f32 {
  var q = vec3f(p.x, max(abs(p.y) - r, 0), p.z);
  return length(vec2f(length(q.xy )- t.x, q.z)) - t.y;
}

fn sdLongSphere(p: vec3f, b: vec2f) -> f32{
  var q = p;
  q.y -= clamp(q.y, -b.x, b.x);
  return length(q) - b.y;
}

fn sdHex(p: vec3f, h: vec2f) -> f32 {
  var k = vec3(-sr3/2., 0.5, sr3/3.);
  var q = abs(p);
  q -= vec3f(2. * min(dot(k.xy, q.xy), 0.) * k.xy, 0);
  var d = vec2f(
    length(q.xy - vec2f(clamp(q.x, -k.z * h.x, k.z * h.x), h.x)) * sign(q.y - h.x),
    q.z - h.y
  );
  return min(max(d.x, d.y), 0) + length  (max(d, unit.yy));
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
  var h = max(k - abs(a - b), 0.) / k;
  return min(a, b) - pow(h, 3) * k / 6.;
}