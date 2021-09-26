import { createReadStream } from "fs";
import { createInterface } from "readline";
import { last, error,hash } from "./util.js";

const cwd = process.cwd();
globalThis.hash_code = 0;

export default async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  const fileStream = createReadStream(path_to_file);

  const rl = createInterface({
    input: fileStream,
  });

  await classifyScopes(rl);
}

async function classifyScopes(rl) {
  let scope_stack = ["global"];
  let last_depth = 0;
  let last_if_hash = null;
  let last_comment = false;

  for await (let line of rl) {
    const depth = checkDepth(line);

    // check for comments
    if (line.includes("#")) {
      if (line.includes("##")) last_comment = last_comment ? false : true;
      line = line.split("#")[0];
    }

    line = line.trim();
    if (last_comment);
    else if (line) {
      // line not empty
      const line_before = scopes[last(scope_stack)].slice(-1).pop();

      if (line.startsWith("import ")) await importFile(line.slice(6));
      //no change
      else if (last_depth == depth) scopes[last(scope_stack)].push(line);
      // came out
      else if (last_depth > depth) {
        for (const _ of Array(last_depth - depth)) scope_stack.pop();
        scopes[last(scope_stack)].push(line);
      }
      // diving into
      else if (last_depth < depth) {
        // new function
        if (line_before.startsWith("function")) {
          // remove declaration line
          scopes[last(scope_stack)].pop();

          let function_name = line_before.split(" ").filter(Boolean);
          function_name = function_name[1];

          scopes[function_name] = [line_before, line];
          scope_stack.push(function_name);
        }
        // if statments
        else if (line_before.startsWith("if")) {
          const hash_name = hash();

          // remove line before
          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          const if_hash_name = hash();
          scopes[if_hash_name] = [line];
          scope_stack.push(if_hash_name);

          last_if_hash = hash_name;
          scopes[hash_name] = [line_before, if_hash_name];
        }
        // else / else if
        else if (line_before.startsWith("else")) {
          if (!last_if_hash) error(`invalid if statment - ${line_before}`);
          scopes[last(scope_stack)].pop();

          const hash_name = hash();
          scope_stack.push(hash_name);
          scopes[hash_name] = [line];

          scopes[last_if_hash].push(line_before, hash_name);
          if (!line_before.startsWith("elseif")) last_if_hash = null;
        }

        // while / loops
        else {
          const hash_name = hash();

          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          scopes[hash_name] = [line_before, line];
          scope_stack.push(hash_name);
        }
      }
      last_depth = depth;
    }
  }
}

function checkDepth(line) {
  let count = 0;

  while (line.startsWith(" ")) {
    count++;
    line = line.substring(1);
  }

  return Math.floor(count / config.tab);
}
