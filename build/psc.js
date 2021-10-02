#! /usr/bin/env node 
globalThis.release_mode=!0;import{createInterface}from"readline";import{readFileSync,writeFileSync,existsSync,createReadStream}from"fs";function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}async function classifyScopes(e,s){let o=["global"],t=0,i,c=null,r=!1;for(var n of e){var l,a,p,h=checkDepth(n);if(n.includes("#")&&(n.includes("##")&&(r=!r),n=n.split("#")[0]),n=n.trim(),!r&&n){if(n.startsWith("import "))await s(n.slice(6));else if(t==h)scopes[last(o)].push(n);else if(t>h){for(const u of Array(t-h))o.pop();scopes[last(o)].push(n)}else t<h&&(i.startsWith("function")?(scopes[last(o)].pop(),a=(a=i.split(" ").filter(Boolean))[1],scopes[a]=[i,n],o.push(a)):i.startsWith("if")?(l=hash(),scopes[last(o)].pop(),scopes[last(o)].push(`${l}`),a=hash(),scopes[a]=[n],o.push(a),c=l,scopes[l]=[i,a]):i.startsWith("else")?(c||error(`invalid if statment - ${i}`),scopes[last(o)].pop(),p=hash(),o.push(p),scopes[p]=[n],scopes[c].push(i,p),i.startsWith("elseif")||(c=null)):i.startsWith("while")||i.startsWith("loop")?(p=hash(),scopes[last(o)].pop(),scopes[last(o)].push(`${p}`),scopes[p]=[i,n],o.push(p)):error(`invalid scope change\n${i}\n  ${n}`));t=h,i=n}}}function checkDepth(e){let s=0;for(;e.startsWith(" ");)s++,e=e.substring(1);return Math.floor(s/config.tab)}function hash$1(){return hash_code++,`@${hash_code}`}function compileGlobalScope(){globalThis.file="",globalThis.var_list=[],compileScope(scopes.global),log(file)}function compileScope(e){for(var s of e=e.slice())s.startsWith("@")?checkForKeyWords(s):write(compileLine(s))}function checkForKeyWords(e){const s=globalThis.scopes[e][0];return s.startsWith("while")?whileLoop(e):s.startsWith("loop")?basicLoop(e):s.startsWith("if")?if_statement(e):void 0}function write(e){file+=e+"\n"}function if_statement(e){}function basicLoop(e){const s=globalThis.scopes[e];var o=compileLine("number "+s.shift().slice(4));write(`let ${e="var"+hash$1().substring(1)} = ${o}`),write(`while(${e} != 0) {`),write(`${e} -= 1`),compileScope(s),write("}")}function whileLoop(e){const s=globalThis.scopes[e];write(`while(${compileLine(s.shift().slice(5))}) {`),compileScope(s),write("}")}function compileLine(e){let s="";for(const o of e=e.split(" | ").filter(Boolean).reverse())s=compileStatments(o+" "+s);return s}function compileStatments(e){return compileCommand(e=e.split(" ").filter(Boolean))}function compileCommand(e){var s=checkToken(e.shift());switch(s){case"log":return`console.log(${e=e.reduce((e,s)=>e+checkToken(s)+",","")})`;case"add":return e.reduce((e,s)=>e+checkToken(s)+"+","").slice(0,-1)}var o=checkToken(e.shift());switch(s){case"number":return`Number(${o})`;case"boolean":return`Boolean(${o})`}var t=checkToken(e.shift());switch(s){case"set":return setVar(o,t);case"eq":return`${o} == ${t}`;case"gt":return`${o} > ${t}`;case"lt":return`${o} < ${t}`;case"ge":return`${o} >= ${t}`;case"le":return`${o} <= ${t}`}}function setVar(e,s){return var_list.includes(e)?`${e} = ${s}`:(var_list.push(e),`let ${e} = ${s}`)}function checkToken(e){return void 0===e?error("undefined token found"):e.startsWith("$")?e.substring(1):e}const args=process.argv.splice(2),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}function init(){run([`import ${args.shift()}`])}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],await classifyScopes(e,importFile),compileGlobalScope(scopes.global),"undefined"==typeof release_mode&&console.log(scopes),writeFileSync("test.js",globalThis.file)}async function importFile(e){e=cwd+"/"+e.trim();if(!existsSync(e))return error(`path: ${e} doesnot exist`);e=createReadStream(e);const s=[];for await(const o of createInterface({input:e}))s.push(o);await classifyScopes(s,importFile)}globalThis.config=loadJson("../config.json"),globalThis.log=e=>{console.log(e)},globalThis.error=e=>{console.log(`[ERROR] ${e}`),process.exit()},init();
