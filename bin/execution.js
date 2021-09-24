import { value } from "./util.js";

export default function runScope(scope, vars = {}) {
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

function runFunction(scope, args) {
  // functions is empty
  if (!scope) return null;

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
  while (count) {
    runScope(scopes[lines], vars);
    count--;
    if (!x) return console.log("stack overflow");
    else x--;
  }
}

function whileLoop(lines, vars) {
  let command = scopes[lines].slice();
  command = command.shift() + " ";

  command = "boolean" + command.slice(5, -1);

  let x = config.max_loop_limit;
  while (runLine(command, vars)) {
    runScope(scopes[lines], vars);
    if (!x) return console.log("stack overflow");
    else x--;
  }
}

function runLine(lines, vars) {
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

function runStatement(line, vars) {
  line = line.split(" ").filter(Boolean);

  const command = line.shift();
  const target = line.shift();

  return runCommand(vars, command, target, line);
}

function runCommand(vars, command, target, line) {
  // basic command
  switch (command) {
    case "exit":
      process.exit();
    case "set":
      if (vars.hasOwnProperty(target))
        vars[target] = value(line.shift(), vars);
      else scopes.vars[target] = value(line.shift(), vars);
      return null;
    case "log":
      console.log(value(target, vars));
      return null;
    case "call":
      const args = [];
      for (const arg of line) args.push(value(arg, vars));
      return runFunction(scopes[target].slice(), args);
    case "boolean":
      return Boolean(value(target, vars));
    case "not":
      return !Boolean(value(target, vars));
  }

  // operators
  let sum;
  switch (command) {
    case "add":
      sum = value(target, vars);
      for (const num of line) sum += value(num, vars);
      return sum;
    case "subtract":
      sum = value(target, vars);
      for (const num of line) sum -= value(num, vars);
      return sum;
    case "multiply":
      sum = value(target, vars);
      for (const num of line) sum *= value(num, vars);
      return sum;
    case "divide":
      sum = value(target, vars);
      for (const num of line) sum /= value(num, vars);
      return sum;
    case "reminder":
      sum = value(target, vars);
      for (const num of line) sum = sum % value(num, vars);
      return sum;
    case "pow":
      sum = value(target, vars);
      return Math.pow(value(target, vars), value(line.shift(), vars));
  }

  // logic
  let b = line.shift();
  if (!b && b != 0) return null;
  let a = value(target, vars);
  b = value(b, vars);

  switch (command) {
    case "eq":
      return a == b;
    case "gt":
      return a > b;
    case "lt":
      return a < b;
    case "ge":
      return a >= b;
    case "le":
      return a <= b;
  }
}
