export default class VertexData {
  static parseType(str) {
    const match = str.match(/^(s|u)?([a-z]+)(\d+)(x)?(\d+)?$/);
    if (!match) return false;
    const signed = match[1] !== 'u';
    const [, , type, bytes, , length] = match;
    return { signed, type, bytes, length };
  }

  constructor(program, data) {
    this.program = program;
    this.device = program.device;

    data.forEach((entry) => {
      if (Array.isArray(entry)) {
        entry = {
          data: entry,
          format: 'float32',
        };
      }
      const format = VertexData.parseType(entry.format);
      const byteLength = format.bytes * format.length;
    });
  }
}
window.v = VertexData;