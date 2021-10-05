import classifyScopes from "../interpreter/process.js";
import compileScope from "./compilation.js";

import { createInterface } from "readline";
import { readFileSync, existsSync, createReadStream, writeFileSync } from "fs";

const args = process.argv.splice(2);
const cwd = process.cwd();

globalThis.config = loadJson("../config.json");

function loadJson(path) {
  const content = readFileSync(new URL(path, import.meta.url));
  return JSON.parse(content);
}

globalThis.log = (string) => {
  console.log(string);
};

globalThis.error = (msg) => {
  if (globalThis.enable_catch) {
    globalThis.currentError = msg;
    return !undefined_var;
  }
  throw `[ERROR] ${msg}`;
};

init();
function init() {
  run([`import ${args.shift()}`]);
}

async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];
  scopes.string = {};

  await classifyScopes(file, importFile);
  compileScope(scopes.global);
  if (typeof release_mode == "undefined") console.log(scopes);
  const output = args.shift()
  log(`writing to ${output}`)
  writeFileSync(output ? output: error(`invalid output file name ${output}`), globalThis.file);
  log('compiled successfully!')
}

async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  if (!existsSync(path_to_file))
    return error(`path: ${path_to_file} doesnot exist`);

  const fileStream = createReadStream(path_to_file);

  const rl = createInterface({
    input: fileStream,
  });

  const file = [];
  for await (const line of rl) file.push(line);
  await classifyScopes(file, importFile);
}
