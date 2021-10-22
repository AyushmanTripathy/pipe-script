# Conditional Flow

"do this" or "do that" based on some condition.

## If Statements

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

## Switch Case

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
