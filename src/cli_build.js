import runScope from "./execution.js";
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

globalThis.error = (msg) => {
  console.log("\x1b[31m", msg, "\x1b[31m");
  process.exit();
};

init()
function init() {
  run([`import ${args.shift()}`]);
}

export default async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};

  await classifyScopes(file, importFile);
  runScope(scopes.global, scopes.vars);
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
