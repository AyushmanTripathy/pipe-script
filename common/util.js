export function value(target, variables) {
  switch (typeof target) {
    case "string":
      const value = checkType(checkForVars(target, variables));
      if (target.startsWith("-$")) return value * -1;
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

  if (typeof value != "string") return value;

  // string
  if (value.startsWith("%string")) {
    value = value.split("%");
    value = scopes[value[1]][value[2]];
  }

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

export function checkArgs (args) {
  const options = [] 
  const words = [];

  for (const arg of args) {
    if (arg.startsWith('-')) {
      options.push(arg.substring(1))
    } else {
      words.push(arg)
    }
  }

  return { options ,words }
}

export function stringify(str) {
  return str.split(" ").join("[s]");
}

export function str(str) {
  if (typeof str != "string") return str;
  str = str.split("[s]").join(" ");
  return str;
}

export function pointer(pointer) {
  pointer = pointer.split('%')
  return scopes[pointer[1]][pointer[2]]
}

export function isNumber(num){
  return (Number(num) || num == 0)
}

export function hash() {
  hash_code++;
  return `@${hash_code}`;
}

export function last(arr) {
  return arr[arr.length - 1];
}

export function random(x) {
  return Math.floor(Math.random() * x);
}
