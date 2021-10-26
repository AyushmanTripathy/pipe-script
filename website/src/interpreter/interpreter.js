import runScope from "../../../interpreter/execution.js";
import classifyScopes from "../../../common/process.js";

globalThis.config = {
  tab: '\t',
  max_loop_limit: 1000,
};

globalThis.error = (msg, type) => {
  if (globalThis.enable_catch) {
    globalThis.currentError = msg;
    return !undefined_var;
  }
  if (!type) throw `[RUNTIME ERROR] ${msg}`;
  throw `[SYNTAX ERROR] ${msg}`;
};

globalThis.log = (string) => {
  logs.update((log) => log + `${string}\n`);
};

export default async function execute(file,logs) {
  logs.set("");
  globalThis.logs = logs;

  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};
  scopes.string = {};

  try {
    await classifyScopes(file, import_function);
    runScope(scopes.global, scopes.vars);
    console.log(scopes);
  } catch (error) {
    log(error);
    log("FATAL ERROR - terminating program...");
  }
}

function import_function(path) {
  error(`cannot import file ${path} from online editor`);
}
