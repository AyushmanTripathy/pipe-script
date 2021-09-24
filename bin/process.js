import { createReadStream } from 'fs'
import { createInterface } from 'readline';
import { last, random } from "./util.js";

const cwd = process.cwd();

export async function importFile(path) {
  const path_to_file = cwd + "/" + path.trim();
  const fileStream = createReadStream(path_to_file);

  const rl = createInterface({
    input: fileStream,
  });

  await classifyScopes(rl);
}

export async function classifyScopes(rl) {
  let scope_stack = ["global"];
  let last_depth = 0;
  let last_if_hash;
  let last_comment = false

  for await (let line of rl) {
    const depth = checkDepth(line);

    // check for comments
    if (line.includes("#")) {
      if (line.includes('##'))
        last_comment = last_comment ? false : true;
      line = line.split("#")[0];
    }

    line = line.trim();
    if (last_comment);
    // line not empty
    else if (line) {
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
          const hash_name = "@" + Date.now() + random(1000);

          // remove line before
          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          const if_hash_name = "@" + Date.now() + random(1000);
          scopes[if_hash_name] = [line];
          scope_stack.push(if_hash_name);

          last_if_hash = hash_name;
          scopes[hash_name] = [line_before, if_hash_name];
        }
        // else / else if
        else if (line_before.startsWith("else")) {
          scopes[last(scope_stack)].pop();

          const hash_name = "@" + Date.now() + random(1000);
          scope_stack.push(hash_name);
          scopes[hash_name] = [line];

          scopes[last_if_hash].push(line_before, hash_name);
        }

        // while / loops
        else {
          const hash_name = "@" + Date.now() + random(1000);

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
