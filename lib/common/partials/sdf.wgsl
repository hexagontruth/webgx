// These are mostly adapted from GLSL signed distance functions by Inigo Quilez:
// https://iquilezles.org/articles/distfunctions/

fn sdBox(p: vec3f, b: vec3f) -> f32 {
  var q = abs(p) - b;
  return length(max(q, unit.yyy)) + min(amax3(q), 0);
}

fn sdTorus(p: vec3f, t: vec2f) -> f32 {
  var q = vec2f(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}