export default function compileGlobalScope() {
  globalThis.file = "";
  globalThis.var_list = []

  compileScope(scopes.global);
  log(file);
}

function compileScope(scope) {
  scope = scope.slice();

  // compile lines
  for (let line of scope) {
    // check for loops / if
    if (line.startsWith("@")) checkForKeyWords(line);
    else write(compileLine(line))
  }
}

function checkForKeyWords(line) {
  const first_line = globalThis.scopes[line][0];

  if (first_line.startsWith("while")) return whileLoop(line);
  else if (first_line.startsWith("loop")) return basicLoop(line);
  else if (first_line.startsWith("if")) return if_statement(line);
}

function write(string) {
  file += string + "\n"
}

function if_statement(hash_code) {}
function basicLoop(hash_code) {}

function whileLoop(hash_code) {
  const scope = globalThis.scopes[hash_code]
  let line = compileLine(scope.shift().slice(5))
  write(`while(${line}) {`)
  compileScope(scope)
  write('}')
}

function compileLine(line) {
  line = line.split(" | ").filter(Boolean).reverse();
  let temp = "";
  for (const statment of line) {
    temp = compileStatments(statment + " " + temp);
  }
  return temp;
}

function compileStatments(line) {
  line = line.split(" ").filter(Boolean);
  return compileCommand(line);
}

function compileCommand(line) {
  const command = checkToken(line.shift());

  //MULTIPLE
  switch (command) {
    case "log":
      line = line.reduce((acc, cur) => acc + checkToken(cur) + ",", "");
      return `console.log(${line})`;
    case "add":
      return line
        .reduce((acc, cur) => acc + checkToken(cur) + "+", "")
        .slice(0, -1);
  }

  const $1 = checkToken(line.shift());
  const $2 = checkToken(line.shift());
  switch (command) {
    case "set":
      return setVar($1,$2);

    // logic
    case "eq":
      return `${$1} == ${$2}`
    case "gt":
      return `${$1} > ${$2}`
    case "lt":
      return `${$1} < ${$2}`
    case "ge":
      return `${$1} >= ${$2}`
    case "le":
      return `${$1} <= ${$2}`
  }
}

function setVar ($1,$2){
  if(var_list.includes($1)) return `${$1} = ${$2}`

  var_list.push($1);
  return `let ${$1} = ${$2}`
}

function checkToken(token) {
  if (typeof token == "undefined") return error("undefined token found");
  if (token.startsWith("$")) return token.substring(1);
  return token;
}
