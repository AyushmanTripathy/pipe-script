import { value , str , hash } from "./util.js";

export default function runGlobalScope() {
  const { breaked } = runScope(scopes.global, scopes.vars);
  if (breaked) error(`invalid break statment in global scope`);
}

function runScope(scope, vars = {}) {
  scope = scope.slice();

  // run lines
  for (let line of scope) {
    // check for loops / if
    if (line.startsWith("@")) {
      const return_value = checkForKeyWords(line, vars);
      if (return_value.returned || return_value.breaked) return return_value;
    } else {
      if (line.startsWith("break")) return { breaked: true };
      const output = runLine(line, vars);
      if (line.startsWith("return"))
        return { returned: true, value: value(output, vars) };
    }
  }
  return { value: null };
}

function checkForKeyWords(line, vars) {
  const first_line = globalThis.scopes[line][0];

  if (first_line.startsWith("while")) return whileLoop(line, vars);
  else if (first_line.startsWith("loop")) return basicLoop(line, vars);
  else if (first_line.startsWith("if")) return if_statement(line, vars);
  return { value: null };
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
  const return_value = runScope(scope, vars);

  if (return_value.breaked)
    error(`invalid break statment in function ${target}`);
  return return_value;
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

  if (hash) return runScope(scopes[hash], vars);
  else return {};
}

function basicLoop(lines, vars) {
  let count = scopes[lines].slice();
  count = count.shift() + " ";
  count = runLine("number " + count.slice(4, -1).trim(), vars);

  let x = config.max_loop_limit;

  while (count > 0) {
    const { breaked, returned, value } = runScope(
      scopes[lines].slice(1),
      vars
    );
    if (breaked) break;
    if (returned) return { returned, value };

    count--;
    if (!x) return error("stack overflow");
    else x--;
  }
  return {};
}

function whileLoop(lines, vars) {
  let command = scopes[lines].slice();
  command = command.shift() + " ";

  command = "boolean" + command.slice(5, -1);

  let x = config.max_loop_limit;
  while (runLine(command, vars)) {
    const { breaked, returned, value } = runScope(
      scopes[lines].slice(1),
      vars
    );
    if (breaked) break;
    if (returned) return { returned, value };

    if (!x) return error("stack overflow");
    else x--;
  }
  return {};
}

function runLine(line, vars) {
  line = checkForBlocks(line, vars);
  line = line.split(" | ").filter(Boolean).reverse();
  // piping
  let output = "";
  for (let statment of line) {
    statment = statment.trim();

    statment += ` ${output}`;
    output = runStatement(statment, vars);
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

      if (!line.includes("]")) break;
      else {
        line = checkForBlocks(line, vars, open_stack);
        break;
      }
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
  // key words
  switch (command) {
    case "break":
      return "break";
    case "return":
      return line[0];
  }

  // NO ARG
  switch (command) {
    case "exit":
      process.exit();
    case "random":
      return Math.random();
  }

  // MULTIPLE
  switch (command) {
    case "log":
      log(line.reduce((acc, cur) => (acc += str(value(cur, vars))), ""));
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
    case "number":
      return Number($1);
    case "not":
      return !Boolean($1);
    case "call":
      const args = [];
      for (const arg of line) args.push(value(arg, vars));
      return runFunction($1, args).value;
    case "round":
      return Math.round($1);
    case "floor":
      return Math.floor($1);
    case "new":
      return new_constructor($1, line);
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

  error(`invalid command or arg - ${command} with arg ${[$1, $2, ...line]}`);
}

function new_constructor(type, value) {
  const hash_num = hash();
  switch (type) {
    case "Object":
      scopes.object[hash_num] = {};
      return `%object%${hash_num}`;
    case "Array":
      scopes.array[hash_num] = [];
      return `%array%${hash_num}`;
    default:
      return error(`${type} is not a constructor`);
  }
}

function setValue(target, key, value) {
  target = target.split("%").filter(Boolean);
  switch (target[0]) {
    case "array":
      if (!Number(key) && key != 0)
        error(`expected index to be a number , got ${key}`);
      break;
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
