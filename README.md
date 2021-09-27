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
