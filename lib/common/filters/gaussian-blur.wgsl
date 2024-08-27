#include ../partials/std-header-vertex
#include ../partials/filters
#param sd 2.
#param range 6

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  return gaussianBlur(data.uv, $sd, $range);
}
