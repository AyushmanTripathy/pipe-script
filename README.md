# Pipe Script

A programming language that revolves around piping.

Pipescript is functional, high-level, interpreted/compiled, indented, single threaded, dynamically typed programming language.

Pipescript can be interpreted directly or be compiled into javascript.

### Believes

1. commands for everything
1. human readable code
1. using piping for everything posible
1. using less symbols

#### check it out

install pipe scipt development kit from npm `npm install -g pipescript-dev-kit` which comes with pipescript interpreter (command - pipescript) and pipescript compiler (command - psc)
<br>
plz report any bugs by opening a [issue](https://github.com/AyushmanTripathy/pipe-script/issues)

# Documentation

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

## Function

functions as usual

```ruby
function <name> $arg1 $arg2
  return $arg1

function example $n
  return | add $n 10
```

## Commands

mostly every thing in pipescript is done using commands. command takes arguments and return a output.

### set

used for setting variables

```ruby
set <name> <value>

set n 100
```

**return value** : null
**arguments** : var-name, value

### get

get index or key of refrence types

```ruby
get <refrence-type> <keys/indexs>
```

example

```ruby
# pipescript form
1. get $array 0
2. get $array 0 10 'key'

# javascript form
1. array[0]
2. array[0][10]['key']
```

**return value** : target value
**arguments** : refrence-type, multiple key/index

### log

log multiple inputs to console

```ruby
log <input> ...

log 'this string will get logged'
log 100 100 # 100100
```

**return value** : null
**arguments** : input, input ...

### call

calling a function

```ruby
call <function_name> <arg>

call process 10 10

function process $a $b
  return | add $a $b
```

**return value** : the return value from called function
**arguments** : function-name, args for function

### exit

exit interpreting script

```ruby
exit
```

**return value** : null
**arguments** : none

### Arithmetic

Arithmetic commands

#### Operators

| command  | definition                  | args no  | js equivalent |
| -------- | --------------------------- | -------- | ------------- |
| add      | adds multiple inputs        | multiple | +             |
| divide   | divde multiple inputs       | multiple | /             |
| multiply | multiply multiple inputs    | multiple | \*            |
| neg      | return $1 multiply by -1    | 1        | -1 \* input   |
| reminder | reminder of first / secound | 2        | %             |

#### Functions

| command | definition                  | args no | js equivalent |
| ------- | --------------------------- | ------- | ------------- |
| floor   | floor the number            | 1       | Math.floor()  |
| pow     | power of $1 raised to $2    | 2       | Math.pow()    |
| random  | random number between 0 & 1 | 0       | Math.random() |
| round   | round the number            | 1       | Math.round()  |

### Logic Operators

| command | definition            | args no | js equivalent |
| ------- | --------------------- | ------- | ------------- |
| boolean | change to boolean     | 1       | Boolean()     |
| eq      | equal to              | 2       | ==            |
| ge      | greater than or equal | 2       | >=            |
| gt      | greater than          | 2       | >             |
| le      | less than or equal    | 2       | <=            |
| lt      | less than             | 2       | <             |
| not     | not operator          | 1       | !             |
| ternary | ternary operator      | 3       | $1 ? $2 : $3  |

## Data Types

### Primitive

#### Number

Number include integer and floats

#### Word

basically string without spaces and quotes

```ruby
log word
```

NOTE
word type is not supported by the compiler. using word is not recommended

#### Boolean

boolean as usual

#### Null

null as usual
fun fact, function return null when return statement is not mentioned

#### Undefined

undefined as usual;

## Refrence

refrence types have pointers that point to a js object, array, string. to see the pointer

```ruby
log | new Array
# output -> %array%@1 : []
```

`%array%@1` is example for a pointer

### Array

use the new command to create a array

```ruby
set arr | new Array

# example
log | new Array 1 2 'element'
output -> [1,2,'element']
```

#### Array Commands

array commands take array as first argument

| command  | definition                | args no | js equivalent     |
| -------- | ------------------------- | ------- | ----------------- |
| pop      | pop last element          | 1       | .pop()            |
| shift    | pop first element         | 1       | .shift()          |
| indexof  | get index of element      | 2       | .indexOf()        |
| length   | length of array           | 1       | .length           |
| reverse  | reverse the array         | 1       | .reverse()        |
| last     | last element of array     | 1       | arr[arr.length-1] |
| push     | push $1 to end of array   | 2       | .push()           |
| unshift  | push $1 to start of array | 2       | .unshift()        |
| includes | check if includes $1      | 2       | .includes()       |

### Object

use the new command to create a array

```ruby
set obj | new Object
```

#### Object Commands

object command takes target object as argument

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |

### String

single quotes `' '` are used to declare string

```ruby
log 'this is a string'
```

#### String Commands

string command takes target string as first argument

| command  | definition              | args no | js equivalent |
| -------- | ----------------------- | ------- | ------------- |
| includes | check for search string | 2       | .includes()   |
| indexof  | get index of string     | 2       | .indexOf()    |

## Conditional Flow

"do this" or "do that" based on some condition.

### If Statements

if statements as usual

```ruby
if <boolean>
  # do something
elseif <boolean>
  # do something
else
  # do something
```

learn more about [Logical Operators](#logic-operators)

example

```ruby
if | eq $n 0
  log 'equal to 0'
elseif | lt $n 0
  log 'less than 0'
else
  log 'something else'
```

### Switch Case

switch case as usual.

NOTE
pipescript interpreter support multiple default blocks at diffrent levels but the compiler doesnot. the compiler collects all default blocks and puts all of them in single default block at the end of switch block

```ruby
switch <input>
  case <value>
    # do something
    # break to stop here
  case <value>
    # do something
    # break to stop here
  default
    # do something
```

learn more about [Arithmetic commands](#arithmetic)

example

```ruby
set n 10

switch $n
  case 10
    log 10
    break
  case | add 1 1
    log 1
  default
    log 'default'
```

## Iteration

learn more about [Logical Operators](#logic-operators)

### While Loop

while loop as usual

```ruby
while <condition>
  # do something
  # break to stop
```

example

```ruby
set n 0

while | ge 10 $n
  set n | add $n 1
  log $n
```

### Basic Loop

loop for certain times

```ruby
loop <number>
  # do something
  # break to stop
```

example

```ruby
loop 10
  log 'still looping'
```

### Foreach Loop

loop through items in something iterable ( arrays, objects, string)

```ruby
foreach <var> <something iterable>
  # do something
  # break to stop
```

example

```ruby
set array | new Array

foreach $value $array
  log $value
```
