diamond(10);
function diamond(count) {
  let n = 0;
  while (count >= n) {
    let string = "";
    let star = line("*", n);
    let scroll = line("_", -1 * n + count);
    console.log(scroll + star + star + scroll);
    n = n + 1;
  }
  n = 0;
  while (count >= n) {
    let string = "";
    let scroll = line("_", n);
    let star = line("*", -1 * n + count);
    console.log(scroll + star + star + scroll);
    n = n + 1;
  }
}
function line(char, n) {
  let string = char;
  let var10 = Number(n);
  while (var10 != 0) {
    var10 -= 1;
    string = string + char;
  }
  return string;
}
