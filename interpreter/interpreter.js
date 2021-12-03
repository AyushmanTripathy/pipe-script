import runGlobalScope from "./execution.js";
import { dim,red,green } from "btss"
import classifyScopes from "../common/parser.js";
import { str, checkArgs, system_error, help } from "../common/util.js";

import { createInterface } from "readline";
import { readFileSync, existsSync, watchFile } from "fs";
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
  msg = str(msg);
  if (!type) throw red("[RUNTIME ERROR]")+ msg;
  throw red("[SYNTAX ERROR]") + msg;
};

init();
function init() {
  resetScope();

  if (!words.length && !options.length) return read();
  for (const option of options)
    switch (option) {
      case "w":
        return watchPath(words.shift());
      case "h":
        return help("../interpreter/help.txt");
    }

  run(`import ${words.shift()}`);
}

function resetScope() {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};
  scopes.string = {};
}

async function read() {
  log("PIPESCRIPT INTERPRETER");
  log("use help to know more.");

  globalThis.interactive_mode = true;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completer,
    terminal: true,
  });

  globalThis.completions =
    "log help ternary clear indexof get Array Object add multiply divide random boolean neg number round floor pop shift length reverse last pow reminder push unshift eq ge gt le lt exit set call import new includes".split(
      " "
    );

  ask(rl);
}

function ask(rl) {
  rl.question(green(">>> "), async (input) => {
    input = input.trim();
    try {
      if (input.startsWith("import"))
        await classifyScopes([input], importFile);
      else if (input == "clear") console.clear();
      else if (input == "help") help("../interpreter/help.txt");
      else await classifyScopes(["log | " + input], importFile);
      runGlobalScope();
    } catch (error) {
      console.log(error);
      console.log("FATAL ERROR - terminating execution...");
    }
    scopes.global = [];
    ask(rl);
  });
}

function completer(line) {
  const word = line.split(" ").pop();
  const hits = completions.filter((tag) => tag.startsWith(word));
  return [hits.length ? hits : completions, word];
}

async function watchPath(file_name) {
  if (!file_name) return system_error("file name not specified");
  log(`WATCHING ${file_name}...`);
  const config_swap = { ...config };
  const watch_options = config_swap.watch_options;

  watchFile(file_name, {}, async () => {
    if (watch_options.clear_screen) console.clear();
    log(dim(`> detected change on ${file_name}`));
    await run(`import ${file_name}`);
    resetScope();
    config = config_swap;
  });
}

async function run(file) {
  try {
    await classifyScopes(file, importFile);
    runGlobalScope();
  } catch (error) {
    console.log(error);
    console.log("FATAL ERROR - terminating program...");
    process.exit(1);
  } finally {
    if (typeof release_mode == "undefined") console.log(scopes);
  }
}

async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  if (!existsSync(path_to_file)) return error(`no such file: ${path_to_file}`);

  const file = readFileSync(path_to_file,"utf-8")
  await classifyScopes(file, importFile);
}
