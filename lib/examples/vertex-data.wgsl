#include /common/partials/std-header

struct CustomVertexData {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) cv : vec2f,
  @location(2) color: vec3f,
};


@vertex
fn vertexMain(@location(0) position: vec2f, @location(1) color: vec3f) -> CustomVertexData
{
  var output : CustomVertexData;
  output.position = vec4f(position, 0, 1);
  output.uv = position.xy * 0.5 + 0.5;
  output.cv = position.xy;
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(data: CustomVertexData) -> @location(0) vec4f {
  var v = data.cv / gu.cover.yx;
  var c : vec3f;
  var rad = amax3(cart2hex * v);
  c.x = floor((data.uv.y - gu.time) * 12)/12;
  c.x += step(14/16., rad)/2.;
  c.x += step(10/16., rad)/2.;
  c.x += step(6/16., rad)/2.;
  c.x += floor(data.uv.x * 2)/2;
  c.x += floor(data.uv.y * 2)/2;
  c.x += rgb2hsv3(data.color).x;

  c.y = 0.75;
  c.z = 5./6;
  c = hsv2rgb3(c);
  c = mix(c, hsv2rgb3(data.color), 0.5);
  return vec4f(c, 1);
}