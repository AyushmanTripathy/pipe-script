# Core Concepts

Pipescript is functional, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.\

Pipescript can be interpreted directly or be compiled into javascript.

## Believes

1. commands for everytime
2. using piping for everything posible
3. using less symbols

## Variables

Variables are declared using set command. use $ to use Variables. use -$ sign to get negative

```ruby
# setting variable
set var 10

# using variables
log $var
log -$var
```

## Comments

use # to write comments and ## to write multi-line comments

```ruby
# this is comment

##
this is a comment
this also is a comment
##
```

## Piping

use | to use output of one command as input of another

```ruby
log | add 1 1

# how it is processed

log | add 1 1
log 2

set n | add 1 | multiply 1 2
set n | add 1 2
set n 3
```

## Code Block

[ ] are used encapsulate code

```ruby
log [add 1 1]

# how it is processed
log [add 1 1]
log 2

log [add 1 1] [add 1 1]
log 2 2
```

## Functions

functions as usual

```ruby
function <name> $arg1 $arg2
  return $arg1

function example $n
  return | add $n 10
```
