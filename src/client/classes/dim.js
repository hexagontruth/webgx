export default class Dim extends Array {
  constructor(...args) {
    super();
    this.push(...args);
    const [a, b, c, d] = args;
    Object.assign(this, { a, b, c, d });
  }
}