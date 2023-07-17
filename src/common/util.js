function arrayWrap(v) {
  return Array.isArray(v) ? v : [v];
} 

function indexMap(n) {
  return Array(n).fill().map((_, idx) => idx);
}

function objectMap(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(fn));
}

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
    for (let [key, val] of Object.entries(next)) {
      const baseVal = base[key];
      const baseIsObject = typeof baseVal == 'object';
      const baseIsArray = Array.isArray(baseVal);
      const valIsObject = typeof val == 'object';
      const valIsArray = Array.isArray(val);
      const valIsTyped = ArrayBuffer.isView(val);
      if (val === undefined || ignoreNull && val === null) {
        continue;
      }
      else if (baseIsObject && valIsObject && !baseIsArray && !valIsTyped) {
        base[key] = merge({}, base[key], val);
      }
      else {
        const valObject = val;
        // TODO: Handle array base case
        if (baseIsArray && valIsArray) {
          if (arrayMerge) {
            if (arrayMerge == 'merge') {
              const newVal = baseVal.map((e, i) => val[i] !== undefined ? val[i] : e);
              val = newVal.concat(val.slice(baseVal.length));
            }
            else if (arrayMerge == 'add') {
              val = baseVal.concat(val);
            }
          }
          if (arrayUnique) {
            val = [...new Set(val)];
          }
        }
        if (valObject === val && valIsArray) {
          val = val.slice();
        }
        base[key] = val;
      }
    }
  }
  return base;
}

module.exports = {
  arrayWrap,
  indexMap,
  objectMap,
  merge
};
