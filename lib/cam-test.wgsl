#include /common/structs/global-uniforms
#include /common/structs/cursor-uniforms
#include /common/structs/vertex-data
#include /common/partials/bindings
#include /common/partials/vertex-default

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  var uv = vec2f(data.uv.x, 1 - data.uv.y);
  var s = textureSample(stream, linearSampler, uv);
  var last = textureSample(lastTexture, linearSampler, ((uv * 2 - 1) * 0.9) * 0.5 + 0.5);
  s = vec4f(s.r, last.rg, 1);
  return s;
}
