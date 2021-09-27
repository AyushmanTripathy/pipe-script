
import { readFileSync } from 'fs'
import run from "./psre.js";

const args = process.argv.splice(2);
globalThis.config = loadJson("./config.json");

run([`import ${args.shift()}`])

export function loadJson(path) {
  const content = readFileSync(new URL(path, import.meta.url));
  return JSON.parse(content);
}
