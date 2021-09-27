#! /usr/bin/env node
import { createReadStream, readFileSync } from 'fs';
import { createInterface } from 'readline';

function value(target, variables) {
  switch (typeof target) {
    case "string":
      const value = checkType(checkForVars(target, variables));
      if (target.startsWith("-$")) 
        return value * -1;
      return value;
    case "undefined":
      return error(`detected undefined value`);
    case "NaN":
      return error(`detected NaN value`);
    default:
      return target;
  }
}
function checkType(value) {
  // check for type
  if (value == 0) return 0;
  if (Number(value)) return Number(value);

  if (value == "true") return true;
  if (value == "false") return false;
  if (value == "null") return null;

  return value;
}

function checkForVars(value, variables) {
  if (value.startsWith("-$")) value = value.substring(1);
  if (value.startsWith("$")) {
    if (variables.hasOwnProperty(value.substring(1)))
      return variables[value.substring(1)];
    return scopes.vars[value.substring(1)];
  }

  return value;
}

function hash() {
  hash_code++;
  return `@${hash_code}`;
}

function last(arr) {
  return arr[arr.length - 1];
}

function error(msg) {
  console.log("\x1b[31m", msg, "\x1b[31m");
  process.exit();
}

function runScope(scope, vars = {}) {
  scope = scope.slice();

  // run lines
  for (let lines of scope) {
    // check for loops / if
    if (lines.startsWith("@")) {
      const first_line = global.scopes[lines][0];

      if (first_line.startsWith("while")) whileLoop(lines, vars);
      else if (first_line.startsWith("loop")) basicLoop(lines, vars);
      else if (first_line.startsWith("if")) if_statement(lines, vars);
    } else {
      const output = runLine(lines, vars);
      if (lines.startsWith("return")) return value(output, vars);
    }
  }

  return null;
}

function runFunction(target, args) {
  // functions is empty
  if (!globalThis.scopes.hasOwnProperty(target))
    return error(`${target} is not a function`);
  const scope = globalThis.scopes[target].slice();

  let line = scope.shift().split(" ").filter(Boolean);
  line = line.splice(2);

  // aruments for function
  const vars = {};
  for (const keyword of line) vars[keyword.substring(1)] = args.shift();
  return runScope(scope, vars);
}

function if_statement(hash_name, vars) {
  const statment = scopes[hash_name].slice();

  let hash;
  const count = statment.length / 2;
  for (const _ of new Array(count)) {
    let condition = statment.shift();

    condition = condition + " ";

    if (condition.startsWith("if")) {
      condition = "boolean " + condition.slice(2, -1);
      if (runLine(condition, vars)) {
        hash = statment.shift();
        break;
      }
    } else if (condition.startsWith("elseif")) {
      condition = "boolean " + condition.slice(6, -1);
      if (runLine(condition, vars)) {
        hash = statment.shift();
        break;
      }
    } else if (condition.startsWith("else")) {
      hash = statment.shift();
      break;
    }
    statment.shift();
  }

  if (hash) runScope(scopes[hash], vars);
}

function basicLoop(lines, vars) {
  let count = scopes[lines].slice();
  count = count.shift() + " ";
  count = value(count.slice(4, -1).trim(), vars);

  let x = config.max_loop_limit;

  while (count > 0) {
    runScope(scopes[lines].slice(1), vars);
    count--;
    if (!x) return error("stack overflow");
    else x--;
  }
}

function whileLoop(lines, vars) {
  let command = scopes[lines].slice();
  command = command.shift() + " ";

  command = "boolean" + command.slice(5, -1);

  let x = config.max_loop_limit;
  while (runLine(command, vars)) {
    runScope(scopes[lines].slice(1), vars);
    if (!x) return error("stack overflow");
    else x--;
  }
}

function runLine(lines, vars) {
  lines = checkForBlocks(lines, vars);
  lines = lines.split(" | ").reverse();
  // piping
  let output = "";
  for (let line of lines) {
    line = line.trim();

    if (line.startsWith("return")) {
      if (output != "") return output;
      else return line.split(" ").pop();
    }

    line += ` ${output}`;
    output = runStatement(line, vars);
  }
  return output;
}

function checkForBlocks(line, vars, open_stack = []) {
  if (!line.includes("[") && !line.includes("]")) return line;

  let pos = 0;

  for (const letter of line) {
    if (letter == "[") open_stack.push(pos);
    else if (letter == "]") {
      const open_pos = open_stack.pop();

      line =
        line.slice(0, open_pos) +
        runLine(line.slice(open_pos + 1, pos), vars) +
        line.slice(pos + 1, line.length);

      if (line.includes("]")) {
        line = checkForBlocks(line, vars, open_stack);
        break;
      } else break;
    }
    pos++;
  }
  return line;
}

function runStatement(line, vars) {
  line = line.split(" ").filter(Boolean);
  const command = line.shift();
  return runCommand(vars, command, line);
}

function runCommand(vars, command, line) {
  // NO ARG
  switch (command) {
    case "exit":
      process.exit();
    case "random":
      return Math.random();
    case "Object":
      hash_num = hash();
      scopes.object[`@${hash_num}`] = {};
      return `%object%@${hash_num}`;
    case "Array":
      hash_num = hash();
      scopes.array[`@${hash_num}`] = [];
      return `%array%@${hash_num}`;
  }

  // MULTIPLE
  switch (command) {
     case "log":
      console.log(line.reduce((acc, cur) => (acc += value(cur, vars)), ''));
      return null;

    case "add":
      let first_value = 0;
      if (line.some((n) => typeof value(n, vars) != "number"))
        first_value = "";
      return line.reduce((acc, cur) => acc + value(cur, vars), first_value);
    case "multiply":
      return line.reduce((acc, cur) => (acc *= value(cur, vars)), 1);
    case "divide":
      return line.reduce((acc, cur) => (acc /= value(cur, vars)), 1);
  }

  // 1 ARG
  const $1 = checkArg(line.shift(), command, vars);
  switch (command) {
    case "boolean":
      return Boolean($1);
    case "not":
      return !Boolean($1);
    case "call":
      const args = [];
      for (const arg of line) args.push(value(arg, vars));
      return runFunction($1, args);
    case "round":
      return Math.round($1);
    case "floor":
      return Math.floor($1);
  }

  // 2 ARG
  const $2 = checkArg(line.shift(), command, vars, [$1]);
  switch (command) {
    case "get":
      let pointer = value($1, vars);
      if (!pointer) error(`${$1} is not defined (Array/Object)`);
      pointer = pointer.split("%");
      return scopes[pointer[1]][pointer[2]][$2];
    case "set":
      if (Number($1) || $1 == 0)
        return error(`expected Chars got Number ${$1}`);
      if ($1.startsWith("%"))
        setValue($1, $2, checkArg(line.shift(), command, vars, [$1, $2]));
      else setVar($1, $2, vars);
      return null;
    case "pow":
      sum = $1;
      return Math.pow($1, $2);
    case "reminder":
      return $1 % $2;

    // logic
    case "eq":
      return $1 == $2;
    case "gt":
      return $1 > $2;
    case "lt":
      return $1 < $2;
    case "ge":
      return $1 >= $2;
    case "le":
      return $1 <= $2;
  }

  error(`invalid command - ${command} with arg ${[$1, $2, ...line]}`);
}

function setValue(target, key, value) {
  target = target.split("%").filter(Boolean);
  switch (target[0]) {
    case "array":
      if (!Number(key) && key != 0)
        error(`expected index to be a number , got ${key}`);
  }
  scopes[target[0]][target[1]][key] = value;
}

function setVar(target, value, vars) {
  if (vars.hasOwnProperty(target)) vars[target] = value;
  else scopes.vars[target] = value;
}

function checkArg(target, command, vars, args = []) {
  if (Number(target) || target == 0) return Number(target);
  else if (typeof target == "undefined") {
    error(`invalid command - ${command} with arg ${[target, ...args]}`);
  } else return value(target, vars);
}

const cwd = process.cwd();
globalThis.hash_code = 0;

async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  const fileStream = createReadStream(path_to_file);

  const rl = createInterface({
    input: fileStream,
  });

  const file = [];
  for await(const line of rl) file.push(line);
  await classifyScopes(file);
}

async function classifyScopes(file) {
  let scope_stack = ["global"];
  let last_depth = 0;
  let last_if_hash = null;
  let last_comment = false;

  for (let line of file) {
    const depth = checkDepth(line);

    // check for comments
    if (line.includes("#")) {
      if (line.includes("##")) last_comment = last_comment ? false : true;
      line = line.split("#")[0];
    }

    line = line.trim();
    if (last_comment);
    else if (line) {
      // line not empty
      const line_before = scopes[last(scope_stack)].slice(-1).pop();

      if (line.startsWith("import ")) await importFile(line.slice(6));
      //no change
      else if (last_depth == depth) scopes[last(scope_stack)].push(line);
      // came out
      else if (last_depth > depth) {
        for (const _ of Array(last_depth - depth)) scope_stack.pop();
        scopes[last(scope_stack)].push(line);
      }
      // diving into
      else if (last_depth < depth) {
        // new function
        if (line_before.startsWith("function")) {
          // remove declaration line
          scopes[last(scope_stack)].pop();

          let function_name = line_before.split(" ").filter(Boolean);
          function_name = function_name[1];

          scopes[function_name] = [line_before, line];
          scope_stack.push(function_name);
        }
        // if statments
        else if (line_before.startsWith("if")) {
          const hash_name = hash();

          // remove line before
          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          const if_hash_name = hash();
          scopes[if_hash_name] = [line];
          scope_stack.push(if_hash_name);

          last_if_hash = hash_name;
          scopes[hash_name] = [line_before, if_hash_name];
        }
        // else / else if
        else if (line_before.startsWith("else")) {
          if (!last_if_hash) error(`invalid if statment - ${line_before}`);
          scopes[last(scope_stack)].pop();

          const hash_name = hash();
          scope_stack.push(hash_name);
          scopes[hash_name] = [line];

          scopes[last_if_hash].push(line_before, hash_name);
          if (!line_before.startsWith("elseif")) last_if_hash = null;
        }

        // while / loops
        else {
          const hash_name = hash();

          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          scopes[hash_name] = [line_before, line];
          scope_stack.push(hash_name);
        }
      }
      last_depth = depth;
    }
  }
}

function checkDepth(line) {
  let count = 0;

  while (line.startsWith(" ")) {
    count++;
    line = line.substring(1);
  }

  return Math.floor(count / config.tab);
}

async function run(file) {
  globalThis.scopes = {};
  scopes.global = [];

  scopes.vars = {};
  scopes.object = {};
  scopes.array = {};

  await classifyScopes(file);
  runScope(scopes.global, scopes.vars);
  console.log(scopes);
}

const args = process.argv.splice(2);
globalThis.config = loadJson("./config.json");

run([`import ${args.shift()}`]);

function loadJson(path) {
  const content = readFileSync(new URL(path, import.meta.url));
  return JSON.parse(content);
}

export { loadJson };
