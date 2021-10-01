# Pipe Script

A programming language that revolves around piping.

#### check it out

1. install pipe scipt runtime environment from npm `sudo npm install -g psre`
2. vist pipe scipt [web editor](https://pipescript.netlify.app/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/a22b7a82-8fd8-4f28-9ee8-af363696dc29/deploy-status)](https://app.netlify.com/sites/pipescript/deploys)

### syntax

- functions

```ruby
function <name> <args>
    return <value>
```

- if / else statements

```ruby
if | eq $a 10
    log equal
else
    log unequal
```

- loops

```ruby

# while loops (loop while condition is true)
 while | ge $a 0
     set a | add $a 1
     log $a

# basic loop (loop for some no of times)
  loop 10
    log looping
```

- pipes

piping return value of one command to other command

```ruby
log | add 12 34
```

- code blocks

encapsulate code between `[ Sqaure Brackets ]`
example -

```ruby
log [add 1 1]
```

## Data Types

1.primitive types
2.reference types

#### primitive types

1.number
2.boolean
3.chars
4.null
5.NaN

#### reference types

1.Arrays
2.Objects
3.String
