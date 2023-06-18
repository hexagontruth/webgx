#include partials/std-header-vertex
#param opaque 0.

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  var c = texture(stream, data.uv);
  c.a = clamp(c.a + $opaque, 0, 1);
  return c;
}