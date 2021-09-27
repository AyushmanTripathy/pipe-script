import runScope from "./execution.js";
import  importFile from "./process.js";

export default async function run(path) {
  globalThis.scopes = {};
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};

  await importFile(path);
  runScope(scopes.global, scopes.vars);
  console.log(scopes)
}
