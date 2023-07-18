const pi = 3.14159265359;
const tau = pi * 2;
const e = 2.718281828;
const sr2 = pow(2, 0.5);
const sr3 = pow(3, 0.5);
const ap = sr3/2;
const unit = vec3f(1, 0, -1);

const htWhite = 1. - vec3f(1./36., 1./24., 1./12.);

const hex2cart = mat3x2(
  0,   0,
  1,   0,
  0.5, sr3 / 2.,
);

const cart2hex = mat2x3(
  -1,        1,         0,
  -1. / sr3, -1. / sr3, 2. / sr3,
);

const hex2hex = mat3x3(
  1./3.,          1./3. - 1/sr3,  1./3. + 1/sr3,
  1./3. + 1/sr3,  1./3.,          1./3. - 1/sr3,
  1./3. - 1/sr3,  1./3. + 1/sr3,  1./3.,
);
