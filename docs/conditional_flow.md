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
