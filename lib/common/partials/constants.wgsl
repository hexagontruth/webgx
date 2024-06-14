const pi = 3.14159265359;
const tau = pi * 2;
const e = 2.718281828;
const sr2 = pow(2, 0.5);
const sr3 = pow(3, 0.5);
const ap = sr3/2;
const unit = vec3f(1, 0, -1);
const unitHex = vec3f(1, -0.5, -0.5);
const epsilon = 1. / pow(2, 16);
const epsilonHex = vec3f(-epsilon / 2, -epsilon / 2, epsilon);

const htWhite = 1. - vec3f(1./36., 1./24., 1./12.);

const id2 = mat2x2(
  1, 0,
  0, 1,
);

const id3 = mat3x3(
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
);

const id4 = mat4x4(
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
);

const stdCubic = mat3x3(
  -1 / sr2, -1 / sr2 / sr3, 1 / sr3,
   1 / sr2, -1 / sr2 / sr3, 1 / sr3,
   0,        2 / sr2 / sr3, 1 / sr3
);

const hex2cart = mat3x2(
  0,   0,
  1,   0,
  0.5, sr3 / 2,
);

const cart2hex = mat2x3(
  -1,        1,         0,
  -1 / sr3, -1 / sr3,   2 / sr3,
);

const hex2hex = mat3x3(
  1 / 3.,           1 / 3. - 1 / sr3, 1 / 3. + 1 / sr3,
  1 / 3. + 1 / sr3, 1 / 3.,           1 / 3. - 1 / sr3,
  1 / 3. - 1 / sr3, 1 / 3. + 1 / sr3, 1 / 3.,
);
