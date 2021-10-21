# Iteration

learn more about [Logical Operators](#logic-operators)

## While Loop

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

## Basic Loop

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

## Foreach Loop

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
