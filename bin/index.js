#!/usr/bin/env node

console.clear();

import { createInterface } from "readline";
import runScope from "./execution.js";
import { importFile,classifyScopes }from "./process.js";
import { loadJson } from "./util.js";

// get the arguments
const args = process.argv.splice(2);

global.config = loadJson("../config.json");

if (args.length) runFile();
else runInterpreter();

async function runInterpreter() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  global.scopes = {};

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

    global.scopes = {};
    scopes.global = [];
    await classifyScopes([`${line}`]);
    scopes.vars = vars;

    runScope(scopes.global, scopes.vars);
    vars = scopes.vars;
  });
}

export default async function runFile() {
  global.scopes = {};
  scopes.global = [];
  scopes.vars = {};

  await importFile(args.shift());

  runScope(scopes.global, scopes.vars);
}
