let n = new Object() 
n["op"] = new Array()
n["op"][0] = 10
n["op"][10] = 1
console.log(n["op"],)
for(let index in n["op"]) {
index = n["op"][index]
console.log(index,)
}
