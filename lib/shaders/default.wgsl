struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

struct FancyStruct {
  color: vec4f,
  scale: vec2f,
  offset: vec2f,
};

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@group(0) @binding(0) var<uniform> fancyStruct: FancyStruct;

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  // return vec4f(1, 0, 0, 1);
  var color = vec4f(fragData.position.xyz/100, 1);
  color.r = sin(fancyStruct.color.r) * 0.5 + 0.5;
  return color;
}