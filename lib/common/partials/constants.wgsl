const pi = 3.14159265359;
const tau = pi * 2;
const e = 2.718281828;
const sr2 = pow(2, 0.5);
const sr3 = pow(3, 0.5);
const ap = sr3/2;
const unit = vec3f(1, 0, -1);

const h2c = mat3x2(
  0,   0,
  1,   0,
  0.5, sr3 / 2.,
);

const c2h = mat2x3(
  -1,        1,         0,
  -1. / sr3, -1. / sr3, 2. / sr3,
);

const h2h = mat3x3(
  1./3.,          1./3. - 1/sr3,  1./3. + 1/sr3,
  1./3. + 1/sr3,  1./3.,          1./3. - 1/sr3,
  1./3. - 1/sr3,  1./3. + 1/sr3,  1./3.,
);