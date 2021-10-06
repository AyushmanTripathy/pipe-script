import runGlobalScope from "./execution.js";
import classifyScopes from "../common/process.js";
import { checkArgs } from "../common/util.js";

import { createInterface } from "readline";
import { readFileSync, existsSync, createReadStream, watchFile } from "fs";

const { options, words } = checkArgs(process.argv.splice(2));
const cwd = process.cwd();

globalThis.config = loadJson("../config.json");

function loadJson(path) {
  const content = readFileSync(new URL(path, import.meta.url));
  return JSON.parse(content);
}

globalThis.log = (string) => {
  console.log(string);
};

globalThis.error = (msg, type) => {
  if (!type) throw `[RUNTIME ERROR] ${msg}`;
  throw `[SYNTAX ERROR] ${msg}`;
};

init();
function init() {
  for (const option of options)
    switch (option) {
      case "w":
        return watchPath(words.shift());
      case "c":
        break;
    }
  run([`import ${words.shift()}`]);
}

async function watchPath(file_name) {
  log(`WATCHING ${file_name}...`);
  const config_swap = { ...config }

  watchFile(file_name, {}, async () => {
    log(`detected change on ${file_name}`);
    await run([`import ${file_name}`]);
    config = config_swap
  });
}

async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};
  scopes.string = {};

  try {
    await classifyScopes(file, importFile);
    runGlobalScope();
  } catch (error) {
    console.log(error);
    console.log("FATAL ERROR - terminating program...");
  }
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
