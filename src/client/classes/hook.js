class HookFn {
  static count = 0;

  constructor(owner, fn) {
    this.owner = owner;
    this.fn = fn.bind(owner);
    this.idx = ++HookFn.count;
  }

  call(...args) {
    return this.fn(...args);
  }
}

export default class Hook {
  constructor(owner, ...keys) {
    this.owner = owner;
    this.queues = {};
    this.addKeys(keys);
  }

  addKeys(...keys) {
    for (const key of keys) {
      if (Array.isArray(key)) {
        this.addKeys(...key);
      }
      else {
        this.#getOrCreateQueue(key);
      }
    }
  }

  add(key, fn) {
    const hookFn = fn instanceof HookFn ? fn : new HookFn(this.owner, fn);
    const queue = this.queues[key];
    queue.add(hookFn);
    return hookFn;
  }

  delete(key, id) {
    const queue = this.queues[key];
    if (id instanceof HookFn) {
      return queue.delete(id);
    }
    else if (typeof id == 'number') {
      const hf = Array.from(queue).find((e) => e.idx == id);
      return queue.delete(hf);
    }
  }

  call(key, ...args) {
    this.queues[key].forEach((e) => e.call(...args));
  }

  test(key, ...args) {
    let result;
    for (const hookFn of this.queues[key]) {
      result = hookFn.call(...args);
      if (result === false) break;
    }
    return result !== false;
  }

  async testAsync(key, ...args) {
    let result;
    for (const hookFn of this.queues[key]) {
      result = await hookFn.call(...args);
      if (result === false) break;
    }
    return result !== false;
  }

  map(key, ...args) {
    return Array.from(this.queues[key]).map((e) => e.call(...args));
  }

  reduce(key, val=0) {
    return Array.from(this.queues[key]).reduce((a, hf, i) => {
      return hf.call(a, i);
    }, val);
  }

  reduceAsync(key, val=0) {
    return Array.from(this.queues[key]).reduce(async (a, hf, i) => {
      return await hf.call(await a, i);
    }, val);
  }

  #getOrCreateQueue(key) {
    this.queues[key] = this.queues[key] ?? new Set();
    return this.queues[key];
  }
}
