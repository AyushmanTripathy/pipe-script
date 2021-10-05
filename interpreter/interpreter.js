import runGlobalScope from "./execution.js";
import classifyScopes from "./process.js";

import { createInterface } from "readline";
import { readFileSync, existsSync, createReadStream } from "fs";

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

globalThis.error = (msg,type) => {
  if(globalThis.enable_catch) {
    globalThis.currentError = msg;
    return !undefined_var
  }
  if(!type) throw `[RUNTIME ERROR] ${msg}`
  throw `[SYNTAX ERROR] ${msg}`;
};

init();
function init() {
  run([`import ${args.shift()}`]);
}

async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};
  scopes.string = {};

  await classifyScopes(file, importFile);
  runGlobalScope();
  if (typeof release_mode == "undefined") console.log(scopes);
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
