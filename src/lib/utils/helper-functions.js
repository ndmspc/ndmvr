export function getPads(str) {
  if (str === "simple") {
    return ["pad1"];
  }

  const match = str.match(/^grid(\d+)x(\d+)$/);
  if (!match) throw new Error("Invalid format");

  const n = parseInt(match[1], 10);
  const k = parseInt(match[2], 10);
  const total = n * k;

  return Array.from({ length: total }, (_, i) => `pad${i + 1}`);
}