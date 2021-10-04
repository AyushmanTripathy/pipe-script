import { hash, str } from "../interpreter/util.js";

export default function compileGlobalScope() {
  globalThis.file = "";
  globalThis.global_var_list = [];
  globalThis.function_list = [];

  compileScope(scopes.global, global_var_list);

  for (const function_name of function_list) compileFunction(function_name);

  if (typeof release_mode != "undefined") return;

  log("---");
  log(file);
  log("---");
}

function compileScope(scope, var_list) {
  scope = scope.slice();

  // compile lines
  for (let line of scope) {
    // check for loops / if

    if (line.startsWith("@")) checkForKeyWords(line, var_list);
    else write(compileLine(line, var_list));
  }
}

function checkForKeyWords(line, var_list) {
  const first_line = globalThis.scopes[line][0];

  if (first_line.startsWith("while")) whileLoop(line, var_list.slice());
  else if (first_line.startsWith("loop")) basicLoop(line, var_list.slice());
  else if (first_line.startsWith("if")) if_block(line, var_list);
  else if (first_line.startsWith("try")) try_block(line, var_list);
  else if (first_line.startsWith("switch")) switch_block(line, var_list);
  else error(`invalid block ${first_line}`);
}

function write(string) {
  file += str(string) + "\n";
}

function switch_block(hash_code, var_list) {
  const statments = scopes[hash_code]
  const input = 'pass_input'+statments.shift().slice(6)
  const defaults = []

  write(`switch(${compileLine(input, var_list)}){`)
  for(let i =0;i<statments.length;i++) {
    if (statments[i].startsWith("default")) {
      i++;
      defaults.push(statments[i]);
    } else if (statments[i].startsWith("case")) {
      const condition = compileLine("pass_input " + statments[i].slice(4), var_list);
      i++;
      write(`case ${condition}:`)
      compileScope(scopes[statments[i]], var_list);
    } else error(`invalid keyword ${statments[i]} in switch block`);
  }
  write('default:')
  for (const scope of defaults)
    compileScope(scopes[scope], var_list);

  write('}')
  log(input)
}

function if_block(hash_code, var_list) {
  const statments = scopes[hash_code];

  for (let i = 0; i < statments.length; i++) {
    write(check_if_block(statments[i]), var_list);
    i++;
    compileScope(scopes[statments[i]], var_list);
    write("}");
  }
}

function check_if_block(statment, var_list) {
  if (statment.startsWith("if"))
    return "if(" + compileLine(statment.slice(2), var_list) + "){";
  if (statment.startsWith("elseif"))
    return "else if(" + compileLine(statment.slice(6), var_list) + "){";
  if (statment.startsWith("else")) return "else{";
}

function basicLoop(hash_code, var_list) {
  const scope = globalThis.scopes[hash_code];

  let line = compileLine("number " + scope.shift().slice(4), var_list);
  hash_code = "var" + hash().substring(1);

  write(`let ${hash_code} = ${line}`);
  write(`while(${hash_code} != 0) {`);
  write(`${hash_code} -= 1`);

  compileScope(scope, var_list);
  write("}");
}

function whileLoop(hash_code, var_list) {
  const scope = globalThis.scopes[hash_code];
  let line = compileLine(scope.shift().slice(5));
  write(`while(${line}) {`);
  compileScope(scope, var_list);
  write("}");
}

function try_block(hash_code, var_list) {
  const statment = scopes[hash_code].slice();

  write("try{");
  compileScope(scopes[statment[1]], var_list);

  let error_var = statment[2].split(" ")[1];
  if (error_var) error_var = error_var.substring(1);
  else error_var = `var${hash().substring(1)}`;

  var_list.push(error_var);
  write(`} catch (${error_var}){`);
  compileScope(scopes[statment[3]], var_list);
  write("}");
}

function compileFunction(function_name) {
  const scope = globalThis.scopes[function_name];

  let args = scope.shift().split(" ");
  args = args.splice(2).map(checkToken);

  write(`function ${function_name} (${args.toString()}){`);
  compileScope(scope, args);
  write(`}`);
}

function call_function(function_name, inputs) {
  if (!globalThis.scopes[function_name])
    return error(`${function_name} is not a function`);
  if (!function_list.includes(function_name))
    function_list.push(function_name);
  inputs = inputs.map(checkToken);
  return `${function_name}(${inputs})`;
}

function compileLine(line, var_list) {
  line = checkForBlocks(line, var_list);
  line = line.split(" | ").filter(Boolean).reverse();
  let temp = "";

  for (const statment of line)
    temp = compileStatments(statment + " " + temp, var_list);
  return temp;
}

function checkForBlocks(line, var_list, open_stack = []) {
  if (!line.includes("[") && !line.includes("]")) return line;

  let pos = 0;

  for (const letter of line) {
    if (letter == "[") open_stack.push(pos);
    else if (letter == "]") {
      const open_pos = open_stack.pop();

      line =
        line.slice(0, open_pos) +
        compileLine(line.slice(open_pos + 1, pos), var_list) +
        line.slice(pos + 1, line.length);

      if (!line.includes("]")) break;
      else {
        line = checkForBlocks(line, var_list, open_stack);
        break;
      }
    }
    pos++;
  }
  return line;
}

function compileStatments(line, var_list) {
  line = line.split(" ").filter(Boolean);
  return compileCommand(line, var_list);
}

function compileCommand(line, var_list) {
  const command = checkToken(line.shift());

  //break
  switch (command) {
    case "exit":
      return "process.exit()";
    case "break":
      return "break";
    case "random":
      return "Math.random()";
    case "return":
      return `return ${checkReturn(line.shift())}`;
    case 'pass_input':
      return checkToken(line.shift())
  }

  //MULTIPLE
  switch (command) {
    case "log":
      line = line.reduce((acc, cur) => acc + checkToken(cur, true) + ",", "");
      return `console.log(${line})`;
    case "add":
      return line
        .reduce((acc, cur) => acc + checkToken(cur) + "+", "")
        .slice(0, -1);
    case "multiply":
      return line
        .reduce((acc, cur) => acc + checkToken(cur) + "*", "")
        .slice(0, -1);
    case "divide":
      return line
        .reduce((acc, cur) => acc + checkToken(cur) + "/", "")
        .slice(0, -1);
  }

  // 1 arg
  const $1 = checkToken(line.shift());
  switch (command) {
    case "number":
      return `Number(${$1})`;
    case "boolean":
      return `Boolean(${$1})`;
    case "not":
      return `!Boolean(${$1})`;
    case "call":
      return call_function($1, line);

    //Math
    case "round":
      return `Math.round(${$1})`;
    case "floor":
      return `Math.floor(${$1})`;
  }

  // 2 arg
  const $2 = checkToken(line.shift());
  switch (command) {
    case "set":
      return setVar($1, $2, var_list);

    //Math
    case "reminder":
      return `${$1}%${$2}`;
    case "pow":
      return `Math.pow(${$1},${$2})`;

    // logic
    case "eq":
      return `${$1}==${$2}`;
    case "gt":
      return `${$1}>${$2}`;
    case "lt":
      return `${$1}<${$2}`;
    case "ge":
      return `${$1}>=${$2}`;
    case "le":
      return `${$1}<=${$2}`;
  }

  error(`invalid command ${command}`);
}

function checkReturn(value) {
  if (typeof value == "undefined") return "";
  return checkToken(value);
}

function setVar($1, $2, var_list) {
  if (var_list.includes($1) || global_var_list.includes($1))
    return `${$1} = ${$2}`;
  var_list.push($1);
  return `let ${$1} = ${$2}`;
}

function checkToken(token) {
  if (typeof token == "undefined") return error("undefined token found");
  if (token.startsWith("-$")) return `(-1*${token.substring(2)})`;
  if (token.startsWith("$")) return token.substring(1);
  if (token.startsWith("%")) {
    token = token.split("%");
    return `"${scopes[token[1]][token[2]]}"`;
  }
  return token;
}
