import { value, error, hash } from "./util.js";

export default function runScope(scope, vars = {}) {
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

function checkForBlocks(line, vars) {
  let open;
  let close;

  let x = 3;
  while (line.indexOf("[") >= 0 && line.indexOf("]") >= 0) {
    open = line.indexOf("[");
    close = line.indexOf("]");

    line =
      line.slice(0, open) +
      runLine(line.slice(open + 1, close), vars) +
      line.slice(close + 1, line.length);

    x--;
    if (!x) break;
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
    case "add":
      let first_value = 0;
      if (line.some((n) => typeof value(n, vars) == "string"))
        first_value = "";
      return line.reduce((acc, cur) => acc + value(cur, vars), first_value);
  }

  switch (command) {
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
    case "log":
      console.log($1);
      return null;
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
