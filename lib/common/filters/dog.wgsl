#include ../partials/std-header-vertex
#include ../partials/filters
#param range 6
#param sd 2.
#param mag 8.

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  return dogFilter(data.uv, $sd, $range, $mag);
}
