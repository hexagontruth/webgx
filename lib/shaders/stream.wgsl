#include partials/std-header
#param opaque 0.

@fragment
fn fragment_main(data: VertexData) -> @location(0) vec4f
{
  var c = texture(stream, data.uv);
  c.a = clamp(c.a + $opaque, 0, 1);
  return c;
}