const { abs, ceil, floor, max, min, round, sign } = Math;

class TensorError extends Error {}

class Tensor {
  static size = 1;
  static defaultType = Float32Array;

  constructor(data) {
    const { defaultType } = this.constructor;
    if (!data) {
      this.data = new defaultType(this.constructor.size);
    }
    else if (typeof data == 'number') {
      this.data = new defaultType(Array(this.constructor.size).fill(data));
    }
    else if (!data.length || data.length != this.constructor.size) {
        throw new TensorError(`Invalid data argument for ${this.constructor}`);
    }
    else {
      if (ArrayBuffer.isView(data)) {
        this.data = data;
      }
      else {
        this.data = new defaultType(data);
      }
    }
    this.type = this.data.constructor;
    this.size = this.data.length;
  }

  toArray() {
    return Array.from(this.data);
  }

  copy() {
    return new this.constructor(this.data.slice());
  }

  set(data) {
    if (data instanceof this.constructor) {
      this.set(data.data);
    }
    else if (data.length == this.size) {
      this.set(data);
    }
  }

  had(val) {
    let result;
    if (typeof val == 'number') {
      result = this.data.map((e) => e * val);
    }
    else if (val.length = this.length) {
      result = this.data.map((e, i) => e * val[i]);
    }
    return new this.constructor(result);
  }

  add(val) {
    let result;
    if (typeof val == 'number') {
      result = this.data.map((e) => e + val);
    }
    else if (val.length = this.length) {
      result = this.data.map((e, i) => e + val[i]);
    }
    return new this.constructor(result);
  }

  remainder(val) {
    let result;
    if (typeof val == 'number') {
      result = this.data.map((e) => e % val);
    }
    else if (val.length = this.length) {
      result = this.data.map((e, i) => e % val[i]);
    }
    return new this.constructor(result);
  }

  mod(val) {
    let result;
    if (typeof val == 'number') {
      result = this.data.map((e) => e < 0 ? (val - abs(e) % val) % val : e % val);
    }
    else if (val.length = this.length) {
      result = this.data.map((e, i) => e < 0 ? (val[i] - abs(e) % val[i]) % val : e % val[i]);
    }
    return new this.constructor(result);
  }

  op(op) {
    return new this.constructor(this.data.map((e) => op(e)));
  }

  ceil() {
    return this.op(ceil);
  }

  floor() {
    return this.op(floor);
  }

  round() {
    return this.op(round);
  }
}

class Matrix extends Tensor {
  static dim = [1, 1];

  static identity() {
    const data = Array(this.size).fill(0);
    const minDim = min(...this.dim);
    for (let i = 0; i < minDim; i++) {
      data[i * this.dim[0] + i] = 1;
    }
    return new this(data);
  }

  get det() {
    return this.data[0];
  }

  get t() {
    const [rows, cols] = this.constructor.dim;
    const tConstructor = dimMap[rows][cols];
    const data = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        data.push(this.data[j * cols + i]);
      }
    }
    return new tConstructor(data);
  }
}

class Vector extends Tensor {

}

export class Mat2 extends Matrix {
  static dim = [2, 2];
  static size = 4;

  get det() {
    const [
      a, b,
      c, d
    ] = Array.from(this.data);
    return a * d - c * b;
  }
}

export class Mat3 extends Matrix {
  static dim = [3, 3];
  static size = 9;

  get det() {
    const [
      a, b, c,
      d, e, f,
      g, h, i
    ] = Array.from(this.data);
    return (
        a * e * i + d * h * c + g * b * f
      - c * e * g - f * h * a - i * b * d
    );
  }
}

export class Mat4 extends Matrix {
  static dim = [4, 4];
  static size = 16;
}

export class Vec2 extends Vector {
  static size = 2;
}

export class Vec3 extends Vector {
  static size = 3;
}

export class Vec4 extends Vector {
  static size = 4;
}

const dimMap = [
  [null, null, null, null, null],
  [null, null, Vec2, Vec3, Vec4],
  [null, null, Mat2, null, null],
  [null, null, null, Mat3, null],
  [null, null, null, null, Mat4],
];

export function mat2(data) { return new Mat2(data); }
export function mat3(data) { return new Mat3(data); }
export function mat4(data) { return new Mat4(data); }
export function vec2(data) { return new Vec2(data); }
export function vec3(data) { return new Vec3(data); }
export function vec4(data) { return new Vec4(data); }

mat2.identity = () => Mat2.identity();
mat3.identity = () => Mat3.identity();
mat4.identity = () => Mat4.identity();
