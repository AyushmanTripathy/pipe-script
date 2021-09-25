#!/usr/bin/env node

console.clear();

import { createInterface } from "readline";
import runScope from "./execution.js";
import { importFile,classifyScopes }from "./process.js";
import { loadJson } from "./util.js";

// get the arguments
const args = process.argv.splice(2);

globalThis.config = loadJson("../config.json");

if (args.length) runFile();
else runInterpreter();

async function runInterpreter() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  globalThis.scopes = {};

  let vars = {};
  rl.on("line", async (line) => {
    // check for special
    switch (line.trim()) {
      case "quit":
        process.exit();
      case "help":
        return;
      case "clear":
        return console.clear();
    }

    globalThis.scopes = {};
    scopes.global = [];
    await classifyScopes([`${line}`]);
    scopes.vars = vars;
  
    runScope(scopes.global, scopes.vars);
    vars = scopes.vars;
  });
}

export default async function runFile() {
  globalThis.scopes = {};
  scopes.global = [];
  scopes.vars = {};

  await importFile(args.shift());
  console.log(scopes)
  runScope(scopes.global, scopes.vars);
}
