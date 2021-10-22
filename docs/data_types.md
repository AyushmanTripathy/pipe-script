# Data Types

# Primitive

### Number

Number include integer and floats

### Word

basically string without spaces and quotes

```ruby
log word
```

NOTE
word type is not supported by the compiler. using word is not recommended

### Boolean

boolean as usual

### Null

null as usual
fun fact, function return null when return statement is not mentioned

### Undefined

undefined as usual;

# Refrence

refrence types have pointers that point to a js object, array, string. to see the pointer

```ruby
log | new Array
# output -> %array%@1 : []
```

`%array%@1` is example for a pointer

## Array

use the new command to create a array

```ruby
set arr | new Array
```

### Array Commands

array commands take array as first argument

| command  | definition                | args no | js equivalent     |
| -------- | ------------------------- | ------- | ----------------- |
| pop      | pop last element          | 1       | .pop()            |
| shift    | pop first element         | 1       | .shift()          |
| length   | length of array           | 1       | .length           |
| reverse  | reverse the array         | 1       | .reverse()        |
| last     | last element of array     | 1       | arr[arr.length-1] |
| push     | push $1 to end of array   | 2       | .push()           |
| unshift  | push $1 to start of array | 2       | .unshift()        |
| includes | check if includes $1      | 2       | .includes()       |

## Object

use the new command to create a array

```ruby
set obj | new Object
```

### Object Commands

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |

## String

single quotes `' '` are used to declare string

```ruby
log 'this is a string'
```

### String Commands

| command | definition | args no | js equivalent |
| ------- | ---------- | ------- | ------------- |
