@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> VertexData
{
  var output : VertexData;
  output.uv = vec2f(f32(idx % 2), f32(idx / 2));
  output.cv = output.uv * 2 - 1;
  output.position = vec4f(output.cv, 0, 1);
  output.position.y = output.position.y;
  return output;
}
