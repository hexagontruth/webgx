#include /common/structs/global-uniforms
#include /common/structs/vertex-data
#include /common/partials/constants
#include /common/partials/math
#include /common/partials/color
#include /common/partials/test

@group(0) @binding(0) var<uniform> gu: GlobalUniforms;

#include /common/partials/vertex-default

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f {
  return testPattern(data.uv);
}