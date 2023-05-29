@vertex
fn vertex_main(@location(0) position: vec4f) -> VertexData
{
  var output : VertexData;
  output.position = position;
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  return output;
}
