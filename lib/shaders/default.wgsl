struct Cursor {
  pos: vec2<f32>,
  vel: vec2<f32>,
  acc: vec2<f32>,
  downAt: f32,
  upAt: f32,
  downPos: vec2<f32>,
}

struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(1) uv : vec2<f32>,
};

@group(0) @binding(0) var<uniform> uCounter : u32;
@group(0) @binding(1) var<uniform> uPeriod : u32;
@group(0) @binding(2) var<uniform> uTime : f32;
@group(0) @binding(3) var<uniform> uCursor : Cursor;

@vertex
fn vertex_main(@location(0) position: vec4<f32>) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.uv = position.xy * .5 + .5;
  return output;
}

@fragment
fn fragment_main(fragData : VertexOut) -> @location(0) vec4<f32>
{
  return vec4(fragData.uv, uTime, 1);
}