/* eslint-disable */
export function info(...objects: unknown[]) {
  console.info(...objects);
}

export function debug(...objects: unknown[]) {
  console.log(...objects);
}
export function error(...objects: unknown[]) {
  console.error(...objects);
}

export default {
  debug,
  info,
  error,
};
