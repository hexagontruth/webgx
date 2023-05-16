function merge(...objs) {
  let base = objs.shift();
  let next;
  while (objs.length) {
    next = objs.shift();
    if (next == null)
      continue;
    for (let [key, value] of Object.entries(next)) {
      if (value === undefined) continue;
      if (typeof base[key] =='object' && typeof value == 'object' && !Array.isArray(base[key])) {
        base[key] = merge({}, base[key], value);
      }
      else {
        base[key] = value;
      }
    }
  }
  return base;
}

if (typeof module != undefined) {
  module.exports = { merge };
}
