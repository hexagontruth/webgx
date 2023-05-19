export * from '../common/util';

export async function importObject(path, name='default') {
  const result = await import(/*webpackIgnore: true*/path);
  return result[name];
}

export async function fetchText(path) {
  const result = await fetch(path);
  return await result.text();
}