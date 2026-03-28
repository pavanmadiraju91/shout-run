// Terminal formatting helpers

export function color(text, code) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const green = (t) => color(t, '32');
export const yellow = (t) => color(t, '33');
export const red = (t) => color(t, '31');
export const cyan = (t) => color(t, '36');
export const dim = (t) => color(t, '2');
export const bold = (t) => color(t, '1');

export function banner(title) {
  const line = '━'.repeat(3);
  console.log();
  console.log(bold(cyan(`${line} ${title} ${line}`)));
  console.log();
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
