const Util = (() => {
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

  function promisify(...fnArgs) {
    let result = fnArgs.map((fn) => (...args) => {
      return new Promise((resolve, reject) => {
        args = args.concat((err, data) => {
          if (err)
            reject(err);
          else
            resolve(data);
        });
        fn(...args);
      });
    });
    return result.length == 1 ? result[0] : result;
  };

  return {
    merge,
    promisify,
  };
})();

if (typeof module != 'undefined') module.exports = Util;
