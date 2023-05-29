export * from '../common/util';

export function createElement(...args) {
  const tagName = typeof args[0] == 'string' ? args.shift() : 'div';
  const opts = Object.assign({}, ...args);
  const el = document.createElement(tagName);
  Object.entries(opts).forEach((e) => el.setAttribute(...e));
  return el;
}

export function copyEntries(dest, src, keys) {
  for  (let key of keys) {
    dest[key] = src[key];
  }
  return dest;
}

export async function importObject(path, name='default') {
  const result = await import(/*webpackIgnore: true*/path);
  return result[name];
}

export function isNumber(n) {
  return typeof numberString(n) == 'number';
}

export function numberString(val, opts = {}) {
  if (typeof val != 'string') return val;

  const lowercase = val.toLowerCase();
  if (['infinity', '+infinity'].includes(lowercase)) return Infinity;
  else if (lowercase == '-infinity') return -Infinity;
  else if (lowercase == 'nan') return NaN;
  
  const match = val.match(/^([-+])?(\d+[a-z])?(\d*)(\.)?(\d*)$/);
  if (!match) return val;

  const sign = match[1] == '-' ? -1 : 1;
  const modifier = match[2]?.length ? match[2] : null;
  let wholePart = match[3]?.length ? match[3] : '0';
  let fractPart = match[5]?.length ? match[5] : '0';
  let n = 0, base = 10, baseVal;

  if (modifier) {
    if (modifier.slice(-1) == 'e') {
      baseVal = parseInt(modifier);
    }
    else if (modifier == '0b') {
      base = 2;
    }
    else if (modifier == '0t') {
      base = 3;
    }
    else if (modifier == '0h') {
      base = 6;
    }
    else if (modifier == '0x') {
      base = 16;
    }
    else {
      return val;
    }
  }
  else if (opts.octal == true && wholePart.length > 1 && wholePart[0] == '0') {
    base = 8;
  }

  n = parseInt(wholePart, base);
  n += parseInt(fractPart, base) / base ** fractPart.length;
  if (baseVal) {
    n = baseVal * 10 ** n
  }
  n *= sign;
  return n;
}

export function join(...args) {
  let path = [];
  let initialSeg = true;
  while(args.length) {
    const arg = args.shift();
    const match = arg.match(/^(\/)?(.*?)(\/)?$/);
    if (!match || arg == '') continue;
    const [, lSlash, seg] = match;
    if (initialSeg && lSlash) {
      path.push('');
    }
    const subsegs = seg.split('/');
    if (subsegs.length > 1) {
      args.unshift(...subsegs);
    }
    else {
      if (seg == '..') {
        path.pop(); // potentially problematic
      }
      else if (seg != '.') {
        path.push(seg);
      }
      initialSeg = false;
    }
  }
  return path.join('/');
}

export async function getText(path) {
  const result = await fetch(path);
  return await result.text();
}

export async function postJson(path, obj) {
  const result = await fetch(path, {
    method: 'POST',
    // mode: 'no-cors',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(obj),
  });
  return await result.json();
}