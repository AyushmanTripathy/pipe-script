import runScope from "./execution.js";
import classifyScopes from "./process.js";

export default async function run(file) {
  globalThis.scopes = {};
  globalThis.hash_code = 0;
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};

  await classifyScopes(file);
  runScope(scopes.global, scopes.vars);
  console.log(scopes);
}
