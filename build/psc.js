#! /usr/bin/env node 
globalThis.release_mode=!0;import{createInterface}from"readline";import{readFileSync,writeFileSync,existsSync,createReadStream}from"fs";function stringify(e){return e.split(" ").join("[s]")}function str(e){return"string"!=typeof e?e:e=e.split("[s]").join(" ")}function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}async function classifyScopes(e,s){let t=["global"],o=0,c,i=!1,r=[],n=!1;for(var l of e){var a,p,h,u,f,$=checkDepth(l);if(l.includes("#")&&(l.includes("##")&&(i=!i),l=l.split("#")[0]),l=checkQuotes(l),l=l.replace("[","<").replace("]",">"),l=l.trim(),!i&&l){if(l.startsWith("import "))await s(l.slice(6));else if(o==$)scopes[last(t)].push(l);else if(o>$){for(const g of Array(o-$))t.pop();scopes[last(t)].push(l)}else o<$&&(c.startsWith("function")?(scopes[last(t)].pop(),p=(p=c.split(" ").filter(Boolean))[1],scopes[p]=[c,l],t.push(p)):c.startsWith("if")?(a=hash(),scopes[last(t)].pop(),scopes[last(t)].push(a),p=hash(),scopes[p]=[l],t.push(p),r.push(a),scopes[a]=[c,p]):c.startsWith("else")?(r.length||error(`invalid if block\n${c}\n${l}`,!0),scopes[last(t)].pop(),h=hash(),t.push(h),scopes[h]=[l],scopes[last(r)].push(c,h),c.startsWith("elseif")||r.pop()):c.startsWith("while")||c.startsWith("loop")||c.startsWith("foreach")?(h=hash(),scopes[last(t)].pop(),scopes[last(t)].push(h),scopes[h]=[c,l],t.push(h)):c.startsWith("try")?(n=hash(),u=hash(),scopes[last(t)].pop(),scopes[last(t)].push(n),scopes[u]=[l],scopes[n]=[c,u],t.push(u)):c.startsWith("catch")?(n||error(`try block not found \n ${c}\n${l}`,!0),u=hash(),scopes[n].push(c,u),scopes[last(t)].pop(),scopes[u]=[l],t.pop(),t.push(u),n=null):c.startsWith("switch")?(f=hash(),scopes[last(t)].pop(),scopes[last(t)].push(f),scopes[f]=[c,l],t.push(f)):c.startsWith("default")||c.startsWith("case")?(f=hash(),scopes[f]=[l],scopes[last(t)].push(f),t.push(f)):error(`invalid scope change\n${c}\n${l}`,!0));o=$,c=l}}}function checkQuotes(e){let s=0,t=!1,o=0;for(const r of e){if("'"==r){if(t){var c=hash(),i=e.slice(0,s);return i+=`%string%${c}`,i+=e.slice(o+1,e.length),scopes.string[c]=stringify(e.slice(s+1,o)),checkQuotes(i)}s=o,t=!t}o++}return e}function checkDepth(e){return("\t"==config.tab?checkTab:checkSpace)(e)}function checkSpace(e){let s=0;for(;e.startsWith(" ");)s++,e=e.substring(1);return Math.floor(s/config.tab)}function checkTab(e){let s=0;for(;e.startsWith("\t");)s++,e=e.substring(1);return s}function compileGlobalScope(){globalThis.file="",globalThis.global_var_list=[],globalThis.function_list=[],compileScope(scopes.global,global_var_list);for(const e of function_list)compileFunction(e);"undefined"==typeof release_mode&&(log("---"),log(file),log("---"))}function compileScope(e,s){for(var t of e=e.slice())t.startsWith("@")?checkForKeyWords(t,s):write(compileLine(t,s))}function checkForKeyWords(e,s){const t=globalThis.scopes[e][0];t.startsWith("while")?whileLoop(e,s.slice()):t.startsWith("loop")?basicLoop(e,s.slice()):t.startsWith("if")?if_block(e,s):t.startsWith("try")?try_block(e,s):t.startsWith("switch")?switch_block(e,s):t.startsWith("foreach")?foreach_block(e,s):error(`invalid block ${t}`)}function write(e){file+=str(e)+"\n"}function foreach_block(e,s){const t=scopes[e].slice();let o=t.shift().split(" ");e=o[1].slice(1);o=compileLine("pass_input "+o.splice(2).join(" "),s),s.includes(e)?write(`for(${e} in ${o}) {`):write(`for(let ${e} in ${o}) {`),write(`${e} = ${o}[${e}]`),s.push(e),compileScope(t,s),write("}")}function switch_block(e,s){const t=scopes[e];var o;const c=[];write(`switch(${compileLine("pass_input"+t.shift().slice(6),s)}){`);for(let e=0;e<t.length;e++)t[e].startsWith("default")?(e++,c.push(t[e])):t[e].startsWith("case")?(o=compileLine("pass_input "+t[e].slice(4),s),e++,write(`case ${o}:`),compileScope(scopes[t[e]],s)):error(`invalid keyword ${t[e]} in switch block`);write("default:");for(const i of c)compileScope(scopes[i],s);write("}")}function if_block(e,s){var t=scopes[e];for(let e=0;e<t.length;e++)write(check_if_block(t[e])),e++,compileScope(scopes[t[e]],s),write("}")}function check_if_block(e,s){return e.startsWith("if")?"if("+compileLine(e.slice(2),s)+"){":e.startsWith("elseif")?"else if("+compileLine(e.slice(6),s)+"){":e.startsWith("else")?"else{":void 0}function basicLoop(e,s){const t=globalThis.scopes[e];var o=compileLine("number "+t.shift().slice(4),s);write(`let ${e="var"+hash().substring(1)} = ${o}`),write(`while(${e} != 0) {`),write(`${e} -= 1`),compileScope(t,s),write("}")}function whileLoop(e,s){const t=globalThis.scopes[e];write(`while(${compileLine(t.shift().slice(5))}) {`),compileScope(t,s),write("}")}function try_block(e,s){const t=scopes[e].slice();write("try{"),compileScope(scopes[t[1]],s);let o=t[2].split(" ")[1];o=o?o.substring(1):`var${hash().substring(1)}`,s.push(o),write(`} catch (${o}){`),compileScope(scopes[t[3]],s),write("}")}function compileFunction(e){const s=globalThis.scopes[e];let t=s.shift().split(" ");t=t.splice(2).map(checkToken),write(`function ${e} (${t.toString()}){`),compileScope(s,t),write("}")}function call_function(e,s){return globalThis.scopes[e]?(function_list.includes(e)||function_list.push(e),`${e}(${s=s.map(checkToken)})`):error(`${e} is not a function`)}function compileLine(e,s){let t="";for(const o of e=(e=checkForBlocks(e,s)).split(" | ").filter(Boolean).reverse())t=compileStatments(o+" "+stringify(t),s);return t}function checkForBlocks(e,s,t=[]){if(!e.includes("<")&&!e.includes(">"))return e;let o=0;for(const i of e){if("<"==i)t.push(o);else if(">"==i){var c=t.pop();if((e=e.slice(0,c)+compileLine(e.slice(c+1,o),s)+e.slice(o+1,e.length)).includes(">")){e=checkForBlocks(e,s,t);break}break}o++}return e}function compileStatments(e,s){return compileCommand(e=e.split(" ").filter(Boolean),s)}function compileCommand(e,s){var t=checkToken(e.shift());switch(t){case"true":return!0;case"false":return!1;case"null":return null}switch(t){case"set":return set(e,s);case"exit":return"process.exit()";case"break":return"break";case"random":return"Math.random()";case"return":return`return ${checkReturn(e.shift())}`}switch(t){case"log":return`console.log(${e=e.reduce((e,s)=>e+checkToken(s)+",","")})`;case"add":return e.reduce((e,s)=>e+checkToken(s)+"+","").slice(0,-1);case"multiply":return e.reduce((e,s)=>e+checkToken(s)+"*","").slice(0,-1);case"divide":return e.reduce((e,s)=>e+checkToken(s)+"/","").slice(0,-1)}var o=checkToken(e.shift());switch(t){case"number":return`Number(${o})`;case"boolean":return`Boolean(${o})`;case"not":return`!Boolean(${o})`;case"call":return call_function(o,e);case"new":return`new ${o}()`;case"pass_input":return checkToken(o);case"get":return`${o}[${e=(e=e.map(e=>checkToken(e))).join("][")}]`;case"round":return`Math.round(${o})`;case"floor":return`Math.floor(${o})`;case"pop":return`${o}.pop()`;case"shift":return`${o}.shift()`;case"reverse":return`${o}.reverse()`;case"length":return`${o}.length`;case"last":return`${o}[${o}.length-1]`}var c=checkToken(e.shift());switch(t){case"reminder":return`${o}%${c}`;case"pow":return`Math.pow(${o},${c})`;case"eq":return`${o}==${c}`;case"gt":return`${o}>${c}`;case"lt":return`${o}<${c}`;case"ge":return`${o}>=${c}`;case"le":return`${o}<=${c}`;case"push":return`${o}.push(${c})`;case"includes":return`${o}.includes(${c})`;case"unshift":return`${o}.unshift(${c})`}error(`invalid command ${t}`)}function checkReturn(e){return void 0===e?"":checkToken(e)}function set(e,s){let t=e.shift();return Number(t)||0==t?error(`cannot set ${e.shift()} to Number ${t}`):t.startsWith("-$")?error(`cannot set ${e.shift()} to neg ${t}`):t.startsWith("$")?setValue(t.substring(1),e):setVar(t,e.reduce((e,s)=>e+checkToken(s)+" ",""),s)}function setValue(e,s){var t=(s=s.map(e=>checkToken(e))).pop();return`${e}[${s=s.join("][")}] = ${t}`}function setVar(e,s,t){return t.includes(e)||global_var_list.includes(e)?`${e} = ${s}`:(t.push(e),`let ${e} = ${s}`)}function checkToken(e){return void 0===e?error("undefined token found"):e.startsWith("-$")?`(-1*${e.substring(2)})`:e.startsWith("$")?e.substring(1):e.startsWith("%")?(e=e.split("%"),`"${scopes[e[1]][e[2]]}"`):e}const args=process.argv.splice(2),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}function init(){run([`import ${args.shift()}`])}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.string={};try{await classifyScopes(e,importFile),compileGlobalScope(scopes.global),"undefined"==typeof release_mode&&console.log(scopes);var s=args.shift();log(`writing to ${s}`),writeFileSync(s||error(`invalid output file name ${s}`),globalThis.file),log("compiled successfully!")}catch(e){log(e),log("FATAL ERROR - terminating program..."),"undefined"==typeof release_mode&&console.log(scopes)}}async function importFile(e){e=cwd+"/"+e.trim();if(!existsSync(e))return error(`path: ${e} doesnot exist`);e=createReadStream(e);const s=[];for await(const t of createInterface({input:e}))s.push(t);await classifyScopes(s,importFile)}globalThis.config=loadJson("../config.json"),globalThis.log=e=>{console.log(e)},globalThis.error=(e,s)=>{if(globalThis.enable_catch)return globalThis.currentError=e,!undefined_var;if(s)throw`[SYNTAX ERROR] ${e}`;throw`[COMPILATION ERROR] ${e}`},init();
