## steps

1. classify scopes
    ``` js	
	 const scope_stack = ['global']	
	 for (for line of file)
		// check for comment
		// check for depth
		if (last_depth < depth)
			  if (check keywords)
			  // push new scope to scope stack
	      // replace line with pointer for this scope
	      else
	      // invalid scope change error
    else if (last_depth > depth)
	      // pop last_depth - depth times from scope_stack
	  else 
		    // push line to last scope from scope_stack
	```
2. run scopes
	```js
	for (line of scope)
		// check for scope pointers
		const output = runLine(line)
		if (line startswith return_statement)
			return output
	return null
	```
3. run line
	```js
	line = checkForBlock(line)
	line = line.split(' | ').reverse()
	output = ''
	
	for (statement of line)
		if(statement startswith return_statement)
			return output
		statement += output
		output = runStatment(statement)
	return output
	```
4. check for code block
	```js
	pos = 0
	for(letter of line)
		if(letter == '[')
		// push pos to open_stack
		else if(letter == ']')
			open_pos = open_stack.pop()
			// replace open_pos and pos with with runLine
			if(!line.includes(']')) break
			else 
				line = checkForBlock(line,open_stack)
				break
		pos++	
	```
