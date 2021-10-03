# Pipe Script

A programming language that revolves around piping.

Pipescript is multi paradigm, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.

Pipescript can be interpreted directly or be compiled into javascript.

##### core concepts

1. piping
2. command for every thing (call,set,log)
3. code blocks

#### check it out

1. install pipe scipt development kit from npm `sudo npm install -g pipescript-dev-kit` which comes with pipescript interpreter (command - pipescript) and pipescript compiler (command - psc)
2. or vist pipe scipt's [web editor](https://pipescript.netlify.app/) <br/>
   status of webeditor - [![Netlify Status](https://api.netlify.com/api/v1/badges/a22b7a82-8fd8-4f28-9ee8-af363696dc29/deploy-status)](https://app.netlify.com/sites/pipescript/deploys)

### syntax

see some examples to understand the syntax

- setting variable

```ruby
set x 'this is a var'
log $x
```

- pipes

piping means returning value of one command to other command

```ruby
log | add 12 34
```

- code blocks

code blocks are used to encapsulate code

```ruby
log [add 1 1]
```

- functions

```ruby
function add $a
    return | add $a 10
```

- if / else statements

```ruby
if | eq $a 10
    log equal
else
    log unequal
```

- loops

1. while loop

```ruby
while | ge $a 0
   set a | add $a 1
   log $a
```

2. loop for certain times

```ruby
loop 10
  log looping
```
