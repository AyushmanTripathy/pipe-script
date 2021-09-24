import { readFileSync } from "fs";

export function value(value, variables) {
  if (!value) return null;

  // check for negative
  if (value.startsWith("-$"))
    value = -1 * checkForVars(value.substring(1), variables);
  else value = checkForVars(value, variables);

  return checkType(value);
}

function checkType(value) {
  // check for type
  if (value == 0) {
    return 0;
  }
  if (Number(value)) return Number(value);

  if (value == "true") return true;
  if (value == "false") return false;
  if (value == "null") return null;

  return value;
}

function checkForVars(value, variables) {
  if (value.startsWith("$")) {
    if (variables.hasOwnProperty(value.substring(1)))
      return variables[value.substring(1)];
    return scopes.vars[value.substring(1)];
  } else return value;
}

export function last(arr) {
  return arr[arr.length - 1];
}

export function log(string) {
  console.log(string);
}

export function random(x) {
  return Math.floor(Math.random() * x);
}
export function loadJson(path) {
  const content = readFileSync(new URL(path, import.meta.url));
  return JSON.parse(content);
}
