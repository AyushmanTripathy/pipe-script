import { last, hash } from "./util.js";

export default async function classifyScopes(file, import_function) {
  let scope_stack = ["global"];
  let last_depth = 0;
  let line_before;
  let last_if_hash = null;
  let last_comment = false;

  for (let line of file) {
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
      if (line.startsWith("import ")) await import_function(line.slice(6));
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
        else if (
          line_before.startsWith("while") ||
          line_before.startsWith("loop")
        ) {
          const hash_name = hash();

          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(`${hash_name}`);

          scopes[hash_name] = [line_before, line];
          scope_stack.push(hash_name);
        } else {
          error(`invalid scope change\n${line_before}\n  ${line}`);
        }
      }
      last_depth = depth;
      line_before = line
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