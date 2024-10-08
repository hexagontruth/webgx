fn rgb2hsv(v: vec4f) -> vec4f {
    var c = clamp(v, unit.yyyy, unit.xxxx);
    var K = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    var p = mix(vec4f(c.bg, K.wz), vec4f(c.gb, K.xy), step(c.b, c.g));
    var q = mix(vec4f(p.xyw, c.r), vec4f(c.r, p.yzx), step(p.x, c.r));

    var d = q.x - min(q.w, q.y);
    var e = 1.0e-10;
    return vec4f(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x, c.w);
}

fn hsv2rgb(v: vec4f) -> vec4f {
    var c = vec4f(v.x, clamp(v.yzw, unit.yyy, unit.xxx));
    var K = vec4f(1., 2. / 3., 1. / 3., 3.);
    var p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return vec4f(c.z * mix(K.xxx, clamp(p - K.xxx, unit.yyy, unit.xxx), c.y), c.w);
}

fn rgb2hsv3(c: vec3f) -> vec3f {
    return rgb2hsv(vec4f(c, 1)).xyz;
}

fn hsv2rgb3(c: vec3f) -> vec3f {
    return hsv2rgb(vec4f(c, 1)).rgb;
}
