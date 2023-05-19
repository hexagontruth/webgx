merge.MERGE_ARRAYS = 2
merge.ADD_ARRAYS = 4
merge.ARRAYS_UNIQUE = 8
merge.IGNORE_NULL = 16
function merge(...objs) {
  let arrayMerge, arrayUnique, ignoreNull;
  if (typeof objs.slice(-1)[0] == 'number') {
    const flags = objs.pop();
    if ((flags >> 1) % 2) arrayMerge = 'merge';
    if ((flags >> 2) % 2) arrayMerge = 'add';
    if ((flags >> 3) % 2) arrayUnique = true;
    if ((flags >> 4) % 2) ignoreNull = true;
  }

  const base = objs.shift();
  while (objs.length) {
    let next = objs.shift();
    if (next == null || typeof next != 'object') {
      continue;
    }
    for (let [key, value] of Object.entries(next)) {
      if (value === undefined || ignoreNull && value === null) {
        continue;
      }
      if (typeof base[key] == 'object' && typeof value == 'object' && !Array.isArray(base[key])) {
        base[key] = merge({}, base[key], value);
      }
      else {
        // TODO: Handle array base case
        if (Array.isArray(base[key]) && Array.isArray(value)) {
          if (arrayMerge) {
            if (arrayMerge == 'merge') {
              const newValue = base[key].map((e, i) => value[i] !== undefined ? value[i] : e);
              value = newValue.concat(value.slice(base[key].length));
            }
            else if (arrayMerge == 'add') {
              value = base[key].concat(value);
            }
          }
          if (arrayUnique) {
            value = [...new Set(value)];
          }
        }
        base[key] = value;
      }
    }
  }
  return base;
}

module.exports = { merge };