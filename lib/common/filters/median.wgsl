#include ../partials/std-header-vertex
#include ../partials/filters

@fragment
fn fragmentMain(data: VertexData) -> @location(0) vec4f
{
  return medianFilter(data.uv);
}
