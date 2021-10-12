let n = new Object() 
n["op"] = 0
n["lol"] = 1
console.log(n["op"],)
for(let index in n) {
index = n[index]
console.log(index,)
}
