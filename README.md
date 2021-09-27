# Pipe Script

A programming language that revolves around piping.

#### check it out

1. install pipe scipt runtime environment from npm `sudo npm install -g psre`
2. vist pipe scipt [web editor](https://pipescript.netlify.app/)

### syntax

read the full [docs]()

- basic command

```ruby
 set x | add 12 8   # setting vars
 log $x   # logging vars
```

- if / else statements

```ruby
if | eq $a 10
    log equal
else
    log unequal
```

- while loops

```ruby
 while | ge $a 0
     set a | add $a 1
     log $a
```

## basic commands

1.set

> setting variables
>
> ```ruby
> set <variable name> <value>
> ```

## pipes

piping return value of one command to other command

```ruby
log | add 12 34
```

## code blocks

encapsulate code between `[ Sqaure Brackets ]`
example -

```ruby
log [add 1 1] [add 2 2]
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
