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
  // string
  return value
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
