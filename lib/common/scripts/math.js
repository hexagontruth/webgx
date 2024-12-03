const { abs, round, floor } = Math;

const sr3 = 3 ** 0.5;

const hex2hexMat = [
  1./3.,          1./3. - 1/sr3,  1./3. + 1/sr3,
  1./3. + 1/sr3,  1./3.,          1./3. - 1/sr3,
  1./3. - 1/sr3,  1./3. + 1/sr3,  1./3.,
];

export function hex2hex(v) {
  const m = hex2hexMat;
  return v.map((_, i) => {
    const col = i * 3;
    return v[0] * m[col] + v[1] * m[col + 1] + v[2] * m[col + 2];
  });
}

export function hex2hexT(v) {
  const m = hex2hexMat;
  return v.map((_, i) => {
    return v[0] * m[i] + v[1] * m[i + 3] + v[2] * m[i + 6];
  });
}

export function roundCubic(v) {
  const r = v.map((e) => round(e));
  const [x, y, z] = v.map((e, i) => abs(e - r[i]));
  if (x > y && x > z) {
    r[0] = -r[1] - r[2];
  }
  else if (y > z) {
    r[1] = -r[2] - r[0];
  }
  else {
    r[2] = -r[0] - r[1];
  }
  return r;
}

export function wrapGrid(v, gridRadius) {
  v = hex2hex(v);
  v = v.map((e) => e / gridRadius / sr3);
  const r = roundCubic(v);
  v = v.map((e, i) => e - r[i]);
  v = v.map((e) => e * sr3 * gridRadius);
  v = hex2hexT(v);
  v = roundCubic(v);
  return v;
}

export function toHex(v, dim) {
  v = v.map((e) => e - dim / 2);
  v.push(-v[0] - v[1]);
  return v;
}

export function fromHex(v, dim) {
  v = v.slice(0, 2).map((e) => e + dim / 2);
  return v;
}

export function hexToBufferIdx(p, r) {
  let x = p[0], y = p[1];
  let q = 0;
  if (x >= 0 && y >= 0) {
    x -= r;
    y -= r;
  }
  else if (x >= 0) {
    q = 1;
  }
  else if (y >= 0) {
    q = 2;
  }
  x = (x % r + r) % r;
  y = (y % r + r) % r;
  return r * r * q + y * r + x;
}

export function bufferIdxToHex(idx, r) {
  const square = r * r;
  const q = floor(idx / square);
  const i = idx % square;
  let x = i % r - r;
  let y = floor(i / r) - r;
  if (q == 1) {
    x += r;
  }
  else if (q == 2) {
    y += r;
  }
  else if (x + y < -r) {
    x += r;
    y += r;
  }
  return [x, y, -x - y];
}
window.g  = hexToBufferIdx;
window.h = bufferIdxToHex;