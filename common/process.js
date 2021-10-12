import { last, hash,stringify } from "./util.js";

export default async function classifyScopes(file, import_function) {
  let scope_stack = ["global"];
  let last_depth = 0;
  let line_before;
  let last_comment = false;

  let if_hash_code = [];
  let try_hash_code = false;

  for (let line of file) {
    const depth = checkDepth(line);

    // check for comments
    if (line.includes("#")) {
      if (line.includes("##")) last_comment = last_comment ? false : true;
      line = line.split("#")[0];
    }

    line = checkQuotes(line);
    line = line.replace('[','<').replace(']','>');

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
          scopes[last(scope_stack)].push(hash_name);

          const if_hash_name = hash();
          scopes[if_hash_name] = [line];
          scope_stack.push(if_hash_name);

          if_hash_code.push(hash_name);
          scopes[hash_name] = [line_before, if_hash_name];
        }
        // else / else if
        else if (line_before.startsWith("else")) {
          if (!if_hash_code.length)
            error(`invalid if block\n${line_before}\n${line}`, true);
          scopes[last(scope_stack)].pop();

          const hash_name = hash();
          scope_stack.push(hash_name);
          scopes[hash_name] = [line];

          scopes[last(if_hash_code)].push(line_before, hash_name);
          if (!line_before.startsWith("elseif")) if_hash_code.pop();
        }

        // while / loops
        else if (
          line_before.startsWith("while") ||
          line_before.startsWith("loop")
        ) {
          const hash_name = hash();

          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(hash_name);

          scopes[hash_name] = [line_before, line];
          scope_stack.push(hash_name);
        }

        // try block
        else if (line_before.startsWith("try")) {
          try_hash_code = hash();
          const hash_code = hash();

          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(try_hash_code);

          scopes[hash_code] = [line];
          scopes[try_hash_code] = [line_before, hash_code];
          scope_stack.push(hash_code);
        }

        // catch block
        else if (line_before.startsWith("catch")) {
          if (!try_hash_code)
            error(`try block not found \n ${line_before}\n${line}`, true);

          const hash_code = hash();
          scopes[try_hash_code].push(line_before, hash_code);

          scopes[last(scope_stack)].pop();
          scopes[hash_code] = [line];

          scope_stack.pop();
          scope_stack.push(hash_code);
          try_hash_code = null;
        } else if (line_before.startsWith("switch")) {
          const hash_code = hash();
          scopes[last(scope_stack)].pop();
          scopes[last(scope_stack)].push(hash_code);

          scopes[hash_code] = [line_before, line];
          scope_stack.push(hash_code);
        } else if (
          line_before.startsWith("default") ||
          line_before.startsWith("case")
        ) {
          const hash_code = hash();
          scopes[hash_code] = [line];
          scopes[last(scope_stack)].push(hash_code);
          scope_stack.push(hash_code);
        } else {
          error(`invalid scope change\n${line_before}\n${line}`, true);
        }
      }
      last_depth = depth;
      line_before = line;
    }
  }
}

function checkQuotes(line) {
  let last_index = 0;
  let pair = false;

  let index = 0;
  for (const letter of line) {
    if (letter == "'") {
      if (pair) {
        const hash_code = hash();

        let temp = line.slice(0, last_index);
        temp += `%string%${hash_code}`;
        temp += line.slice(index + 1, line.length);
        scopes.string[hash_code] = stringify(line.slice(last_index + 1, index))
        return checkQuotes(temp);
      } else last_index = index;
      pair = pair ? false : true;
    }
    index++;
  }

  return line;
}

function checkDepth(line) {
  return config.tab == '\t' ? checkTab(line) : checkSpace(line);
}

function checkSpace (line) {
  let count = 0;
  while (line.startsWith(' ')) {
    count++;
    line = line.substring(1);
  }

  return Math.floor(count / config.tab);
}

function checkTab (line) {
  let count = 0

  while(line.startsWith('\t')) {
    count++;
    line = line.substring(1)
  }
  return count
}
