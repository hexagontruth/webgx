export default class TimerBuffer {
  timers = {};

  add(key, fn, delay=0, ...args) {
    if (this.timers[key] === undefined) {
      this.timers[key] = setTimeout(() => {
        fn(...args);
        delete this.timers[key];
      }, delay);
    }
  }
}