# Commands

mostly every thing in pipescript is done using commands. command takes arguments and return a output.

## set

used for setting variables

```ruby
set <name> <value>

set n 100
```

**return value** : null\
**arguments** : var-name value


## log

log multiple inputs to console

```ruby
log <input> ...

log 'this string will get logged'
log 100 100 # 100100
```

**return value** : null\
**arguments** : input input ...

## call

calling a function

```ruby
call <function_name> <arg>

call process 10 10

function process $a $b
  return | add $a $b
```

**return value** : the return value from called function\
**arguments** : function-name (args for function)

## Arithmetic

Arithmetic commands

### Operators

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |
| add | adds multiple inputs | multiple | + |
| divide | divde multiple inputs | multiple | / |
| multiply | multiply multiple inputs | multiple | * |
| neg | return $1 multiply by -1 | 1 | -1 * input |
| reminder | reminder of first / secound | 2 | % |

### Functions

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |
| floor | floor the number | 1 | Math.floor() |
| pow | power of $1 raised to $2 | 2 | Math.pow() |
| random | random number between 0 & 1 | 0 | Math.random() |
| round | round the number | 1 | Math.round() |

## Logic Operators

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |
| boolean | change to boolean | 1 | Boolean() |
| eq | equal to | 2 | == |
| ge | greater than or equal | 2 | >= |
| gt | greater than | 2 | > |
| le | less than or equal | 2 | <= |
| lt | less than | 2 | < |
| not | not operator | 1 | ! |
