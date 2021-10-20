## syntax

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
