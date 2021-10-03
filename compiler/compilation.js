import { hash } from "../interpreter/util.js";

export default function compileGlobalScope() {
  globalThis.file = "";
  globalThis.var_list = [];

  compileScope(scopes.global);
  log("---");
  log(file);
  log("---");
}

function compileScope(scope) {
  scope = scope.slice();

  // compile lines
  for (let line of scope) {
    // check for loops / if
    if (line.startsWith("@")) checkForKeyWords(line);
    else write(compileLine(line));
  }
}

function checkForKeyWords(line) {
  const first_line = globalThis.scopes[line][0];

  if (first_line.startsWith("while")) return whileLoop(line);
  else if (first_line.startsWith("loop")) return basicLoop(line);
  else if (first_line.startsWith("if")) return if_statement(line);
}

function write(string) {
  file += string + "\n";
}

function if_statement(hash_code) {
  const statments = scopes[hash_code];

  for (let i = 0; i < statments.length; i++) {
    write(check_if_block(statments[i]));
    i++;
    compileScope(scopes[statments[i]])
    write("}");
  }
}

function check_if_block(statment) {
  if (statment.startsWith("if"))
    return "if(" + compileLine(statment.slice(2)) + "){";
  if (statment.startsWith("elseif"))
    return "else if(" + compileLine(statment.slice(6)) + "){";
  if (statment.startsWith("else"))
    return "else{";
}

function basicLoop(hash_code) {
  const scope = globalThis.scopes[hash_code];

  let line = compileLine("number " + scope.shift().slice(4));
  hash_code = "var" + hash().substring(1);

  write(`let ${hash_code} = ${line}`);
  write(`while(${hash_code} != 0) {`);
  write(`${hash_code} -= 1`);

  compileScope(scope);
  write("}");
}

function whileLoop(hash_code) {
  const scope = globalThis.scopes[hash_code];
  let line = compileLine(scope.shift().slice(5));
  write(`while(${line}) {`);
  compileScope(scope);
  write("}");
}

function call_function(function_name, inputs) {
  if (!globalThis.scopes[function_name])
    error(`${function_name} is not a function`);
  const scope = globalThis.scopes[function_name];

  let args = scope.shift().split(" ");
  args = args.splice(2).map(checkToken);

  write(`function ${function_name} (${args.toString()}){`);
  compileScope(scope);
  write(`}`);

  inputs = inputs.map(checkToken);
  return `${function_name}(${inputs})`
}

function compileLine(line) {
  line = line.split(" | ").filter(Boolean).reverse();
  let temp = "";
  for (const statment of line) 
    temp = compileStatments(statment + " " + temp);
  return temp;
}

function compileStatments(line) {
  line = line.split(" ").filter(Boolean);
  return compileCommand(line);
}

function compileCommand(line) {
  const command = checkToken(line.shift());

  //break
  switch (command) {
    case "break":
      return "break";
  }

  //MULTIPLE
  switch (command) {
    case "log":
      line = line.reduce((acc, cur) => acc + checkToken(cur,true) + ",", "");
      return `console.log(${line})`;
    case "add":
      return line
        .reduce((acc, cur) => acc + checkToken(cur) + "+", "")
        .slice(0, -1);
  }

  const $1 = checkToken(line.shift());
  switch (command) {
    case "number":
      return `Number(${$1})`;
    case "boolean":
      return `Boolean(${$1})`;
    case "call":
      return call_function($1, line);
    case "return":
      return `return ${$1}`;
  }

  const $2 = checkToken(line.shift());
  switch (command) {
    case "set":
      return setVar($1, $2);

    // logic
    case "eq":
      return `${$1} == ${$2}`;
    case "gt":
      return `${$1} > ${$2}`;
    case "lt":
      return `${$1} < ${$2}`;
    case "ge":
      return `${$1} >= ${$2}`;
    case "le":
      return `${$1} <= ${$2}`;
  }
}

function setVar($1, $2) {
  if (var_list.includes($1)) return `${$1} = ${$2}`;

  $2 = checkString($2)
    var_list.push($1);
  return `let ${$1} = ${$2}`;
}

function checkString (x) {
  if (Number(x) || x == 0) return x
  else if (x == "null") return 'null'
  
  return `"${x}"`
}

function checkToken(token,string) {
  if (typeof token == "undefined") return error("undefined token found");
  if (token.startsWith("$")) return token.substring(1);
  if(string) return checkString(token)
  return token;
}
