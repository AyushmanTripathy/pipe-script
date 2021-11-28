import {
  value,
  str,
  stringify,
  pointer,
  checkType,
  checkPointer,
  isPointer,
  isNumber,
  hash,
  last,
} from "../common/util.js";

export default function runGlobalScope() {
  const { breaked } = runScope(scopes.global, scopes.vars);
  if (breaked) error(`invalid break statment in global scope`);
}

function runScope(scope, vars = {}) {
  if (!scope) return error(`invalid scope`);
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
  else if (first_line.startsWith("try")) return try_block(line, vars);
  else if (first_line.startsWith("switch")) return switch_block(line, vars);
  else if (first_line.startsWith("foreach")) return foreach_block(line, vars);
  error(`invalid block ${first_line}`);
  return {};
}

function runFunction(target, args) {
  config.maximum_call_stack--;
  if (!config.maximum_call_stack) return error("maximum call stack exceded");
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

function foreach_block(hash_code, vars) {
  const scope = scopes[hash_code].slice();
  let statment = scope.shift().split(" ");
  let var_name = statment[1].slice(1);
  statment = runLine("pass_input " + statment.splice(2).join(" "), vars);

  if (isPointer(statment)) statment = pointer(statment);

  if (typeof statment == "object") {
    for (const index in statment) {
      vars[var_name] = statment[index];
      const { breaked, returned, value } = runScope(scope, vars);
      if (breaked) break;
      if (returned) return { returned, value };
    }
  } else error(`${statment} is not iterable`);
  return {};
}

function switch_block(hash_code, vars) {
  const statments = scopes[hash_code];
  const input = runLine("pass_input " + statments.shift().slice(6), vars);

  let return_value = {};
  for (let i = 0; i < statments.length; i++) {
    if (statments[i].startsWith("default")) {
      i++;
      return_value = runScope(scopes[statments[i]], vars);
    } else if (statments[i].startsWith("case")) {
      const condition = runLine("pass_input " + statments[i].slice(4), vars);
      i++;
      if (value(input, vars) == value(condition, vars))
        return_value = runScope(scopes[statments[i]], vars);
    } else error(`invalid keyword ${statments[i]} in switch block`);

    if (return_value.breaked) return { value: null };
    if (return_value.returned) return return_value;
  }

  return {};
}

function try_block(hash_name, vars) {
  const statment = scopes[hash_name].slice();
  let return_value;

  try {
    return_value = runScope(scopes[statment[1]], vars);
  } catch (e) {
    let error_var = statment[2].split(" ")[1];
    if (error_var) setVar(error_var.substring(1), stringify(e), vars);
    return_value = runScope(scopes[statment[3]], vars);
  }

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
    } else {
      error(`invalid if block \n${condition}`);
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
    if (!x) return error("Maximum loop limit reached");
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

    if (!x) return error("Maximum loop limit reached");
    else x--;
  }
  return {};
}

function runLine(line, vars) {
  line = checkForBlocks(line, vars);
  line = line.split("|").filter(Boolean).reverse();

  // piping
  let output = "<Empty>";
  for (let statment of line) {
    statment = statment.split(" ").filter(Boolean);
    if (output != "<Empty>") statment.push(output);
    output = runCommand(vars, statment);
  }
  return output;
}

function checkForBlocks(line, vars, open_stack = []) {
  if (!line.includes("<") && !line.includes(">")) return line;

  let pos = 0;
  for (const letter of line) {
    if (letter == "<") open_stack.push(pos);
    else if (letter == ">") {
      const open_pos = open_stack.pop();

      line =
        line.slice(0, open_pos) +
        runLine(line.slice(open_pos + 1, pos), vars) +
        line.slice(pos + 1, line.length);

      if (!line.includes(">")) break;
      else {
        line = checkForBlocks(line, vars, open_stack);
        break;
      }
    }
    pos++;
  }
  return line;
}

function runCommand(vars, line) {
  const command = line.shift();
  const line_clone = line.slice();

  if (command.startsWith("$")) return `${value(command, vars)}`;

  // key words
  switch (command) {
    case "break":
      return "break";
    case "return":
      return line[0];
    case "pass_input":
      return value(line[0], vars);
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
      log(line.reduce((acc, cur) => (acc += checkLog(cur, vars)), ""));
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
  let $1 = checkArg(line.shift(), command, vars, line_clone);
  switch (command) {
    case "get":
      return get($1, line, vars);
    case "boolean":
      return Boolean($1);
    case "neg":
      return -1 * $1;
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

    // array functions
    case "pop":
      return arr($1, line_clone[0]).pop();
    case "shift":
      return arr($1, line_clone[0]).shift();
    case "length":
      if (isNumber($1)) return error(`cannot read length of number ${$1}]`);
      if (isPointer($1)) $1 = pointer($1);
      return str($1).length;
    case "reverse":
      return clone($1, [...arr($1, line_clone[0]).reverse()]);
    case "last":
      return last(arr($1, line_clone[0]));
  }
  // 2 ARG
  const $2 = checkArg(line.shift(), command, vars, line_clone);
  switch (command) {
    case "set":
      if (isNumber($1))
        return error(`cannot set value to Number ${line_clone[0]}`);
      else if (isPointer($1)) setValue($1, $2, value(line.pop()), line, vars);
      else setVar($1, $2, vars);
      return null;
    case "pow":
      return Math.pow($1, $2);
    case "reminder":
      return $1 % $2;

    // array functions
    case "push":
      arr($1, line_clone[0]).push($2);
      return null;
    case "unshift":
      arr($1, line_clone[0]).unshift($2);
      return null;
    case "includes":
      if (typeof $1 != "string") return error(`cannot get index of ${$1}`);
      if ($1.startsWith("%array"))
        return pointer($1).map(checkPointer).includes($2);
      return $1.includes($2);
    case "indexof":
      if (typeof $1 != "string") return error(`cannot get index of ${$1}`);
      if ($1.startsWith("%array"))
        return pointer($1).map(checkPointer).indexOf($2);
      return $1.indexOf($2);

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

  error(`invalid command or arg - ${command} with arg ${[...line_clone]}`);
}

function arr(value, var_name) {
  if (isNumber(value)) return error(`${var_name} is not a array`);
  if (!value.startsWith("%array")) return error(`${var_name} is not a array`);
  return pointer(value);
}

function checkLog(target, vars) {
  const var_name = target;
  target = value(target, vars);

  if (isPointer(target)) {
    target = pointer(target);
    if (var_name.startsWith("%array")) {
      target = `[${target.map(checkLog)}]`;
    } else if (var_name.startsWith("%object")) target = `Object`;
  }
  return str(target);
}

function clone(pointer, value) {
  const hash_code = hash();
  pointer = pointer.split("%");
  scopes[pointer[1]][hash_code] = value;
  return `%${pointer[1]}%${hash_code}`;
}

function get(target, line, vars) {
  if (isNumber(target))
    return error(`expected refrence type got primitive ${target}`);
  else if (typeof target == "string" && !isPointer(target))
    return target[value(line.shift(), vars)];

  target = target.split("%");
  let val = scopes[target[1]];
  line = line.map((n) => value(n, vars));

  let key = target[2];
  for (let i = 0; i < line.length; i++) {
    if (typeof val[key] == "string" && val[key].startsWith("%"))
      return get(val[key], line.slice(i), vars);

    val = val[key];
    if (typeof val == "undefined")
      return error(`cannot get proprety ${line[i]} of ${val}`);
    key = line[i];
  }

  return val[key];
}

function new_constructor(type, inputs) {
  const hash_num = hash();
  switch (type) {
    case "Object":
      scopes.object[hash_num] = {};
      return `%object%${hash_num}`;
    case "Array":
      scopes.array[hash_num] = inputs.map((n) =>
        isNumber(n) ? Number(n) : n
      );
      return `%array%${hash_num}`;
    default:
      return error(`${type} is not a constructor`);
  }
}

function setValue(target, key, proprety, line, vars) {
  target = target.split("%");
  switch (target[1]) {
    case "array":
      if (!isNumber(key))
        return error(`expected index to be a number , got ${key}`);
      break;
    case "object":
      if (isNumber(key))
        return error(`expected key to be string , got ${key}`);
      break;
    case "string":
      return error(`cannot change ${key} of read only strings`);
  }
  let val = scopes[target[1]];
  line = [key, ...line].map((n) => value(n, vars));

  key = target[2];
  for (let i = 0; i < line.length; i++) {
    if (typeof val[key] == "string" && val[key].startsWith("%")) {
      return setValue(val[key], line[i], proprety, line.slice(i + 1), vars);
    }

    val = val[key];
    if (typeof val == "undefined")
      return error(`cannot set proprety ${line[i]} of ${val}`);
    key = line[i];
  }
  val[key] = proprety;
}

function setVar(target, value, vars) {
  if (vars.hasOwnProperty(target)) vars[target] = value;
  else {
    if (globalThis.interactive_mode) globalThis.completions.push("$" + target);
    scopes.vars[target] = value;
  }
}

function checkArg(target, command, vars, line) {
  if (typeof target == "undefined") {
    error(`invalid command - ${command} with arg ${line}`);
  } else return value(target, vars);
}
