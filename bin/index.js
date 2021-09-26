#!/usr/bin/env node

console.clear();

import runScope from "./execution.js";
import  importFile from "./process.js";
import { loadJson } from "./util.js";

// get the arguments
const args = process.argv.splice(2);

globalThis.config = loadJson("../config.json");

runFile();
export default async function runFile() {
  globalThis.scopes = {};
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};

  await importFile(args.shift());
  runScope(scopes.global, scopes.vars);
  console.log(scopes)
}
