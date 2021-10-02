import runScope from "../../interpreter/execution.js";
import classifyScopes from "../../interpreter/process.js";

import { logs } from "./store.js";

globalThis.config = {
  tab: 2,
  max_loop_limit: 1000,
};

globalThis.error = (msg) => {
  logs.update(log => log + `[ERROR] ${msg}\n`)
}

globalThis.log = (string) => {
  logs.update((log) => log + `${string}\n`);
};

export default async function execute(file) {
  logs.set("");

  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};
  scopes.string = {}

  await classifyScopes(file, import_function);
  runScope(scopes.global, scopes.vars);
  console.log(scopes);
}

function import_function(path) {
  error(`cannot import file ${path} from online editor`);
}
