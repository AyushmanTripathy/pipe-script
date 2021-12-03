import classifyScopes from "../common/parser.js";
import { red, dim } from "btss";
import compileScope from "./compilation.js";

import { system_error, checkArgs, help } from "../common/util.js";
import { readFileSync, existsSync, writeFileSync } from "fs";
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
  if (!type) throw red(`[RUNTIME ERROR]`) + msg;
  throw red("[COMPILATION ERROR]") + msg;
};

init();
function init() {
  for (const option of options) {
    switch (option) {
      case "h":
        return help("../compiler/help.txt");
    }
  }
  if (!words.length) return system_error("input file required");
  run(`import ${words.shift()}`);
}

async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.string = {};

  try {
    await classifyScopes(file, importFile);
    compileScope(scopes.global);
    if (typeof release_mode == "undefined") console.log(scopes);

    if (!words.length) return console.log(globalThis.file);

    // writing
    const output = words.shift();
    log(`writing to ${output}`);
    writeFileSync(
      output ? output : error(`invalid output file name ${output}`),
      globalThis.file
    );
    log("compiled successfully!");
  } catch (error) {
    log(error);
    log(dim("use the interpreter to get a better debuging experience"));
    log("FATAL ERROR - terminating program...");
    if (typeof release_mode == "undefined") console.log(scopes);
    process.exit(1);
  }
}

async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  if (!existsSync(path_to_file))
    return system_error(`path: ${path_to_file} doesnot exist`);

  const file = readFileSync(path_to_file,"utf-8")
  await classifyScopes(file, importFile);
}
