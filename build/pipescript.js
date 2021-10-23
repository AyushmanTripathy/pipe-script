#! /usr/bin/env node 
globalThis.release_mode=!0;import{createInterface}from"readline";import{readFileSync,watchFile,existsSync,createReadStream}from"fs";function value(e,r,t){switch(typeof e){case"string":var s=checkType(checkForVars(e,r));return e.startsWith("-$")?-1*s:s;case"undefined":return error(`${t} is undefined`);case"NaN":return error("detected NaN value");default:return e}}function checkType(e){return 0==e?0:Number(e)?Number(e):"true"==e||"false"!=e&&("null"==e?null:("string"!=typeof e||e.startsWith("%string")&&(e=e.split("%"),e=scopes[e[1]][e[2]]),e))}function checkForVars(e,r){return(e=e.startsWith("-$")?e.substring(1):e).startsWith("$")?(r.hasOwnProperty(e.substring(1))?r:scopes.vars)[e.substring(1)]:e}function checkArgs(e){const r=[],t=[];for(const s of e)s.startsWith("-")?r.push(s.substring(1)):t.push(s);return{options:r,words:t}}function stringify(e){return e.split(" ").join("[s]")}function str(e){return"string"!=typeof e?e:e=e.split("[s]").join(" ")}function checkPointer(e){return isPointer(e)?pointer(e):e}function pointer(e){return e=e.split("%"),scopes[e[1]][e[2]]}function isPointer(e){return"string"==typeof e&&e.startsWith("%")}function isNumber(e){return Number(e)||0==e}function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}function runGlobalScope(){var e=runScope(scopes.global,scopes.vars)["breaked"];e&&error("invalid break statment in global scope")}function runScope(e,r={}){if(!e)return error("invalid scope");for(var t of e=e.slice())if(t.startsWith("@")){var s=checkForKeyWords(t,r);if(s.returned||s.breaked)return s}else{if(t.startsWith("break"))return{breaked:!0};s=runLine(t,r);if(t.startsWith("return"))return{returned:!0,value:value(s,r)}}return{}}function checkForKeyWords(e,r){const t=globalThis.scopes[e][0];return t.startsWith("while")?whileLoop(e,r):t.startsWith("loop")?basicLoop(e,r):t.startsWith("if")?if_statement(e,r):t.startsWith("try")?try_block(e,r):t.startsWith("switch")?switch_block(e,r):t.startsWith("foreach")?foreach_block(e,r):(error(`invalid block ${t}`),{})}function runFunction(e,r){if(config.maximum_call_stack--,!config.maximum_call_stack)return error("maximum call stack exceded");if(!globalThis.scopes.hasOwnProperty(e))return error(`${e} is not a function`);const t=globalThis.scopes[e].slice();let s=t.shift().split(" ").filter(Boolean);s=s.splice(2);const n={};for(const i of s)n[i.substring(1)]=r.shift();var o=runScope(t,n);return o.breaked&&error(`invalid break statment in function ${e}`),o}function foreach_block(e,r){const t=scopes[e].slice();let s=t.shift().split(" ");var n=s[1].slice(1);if(s=runLine("pass_input "+s.splice(2).join(" "),r),isPointer(s)&&(s=pointer(s)),"object"==typeof s)for(const a in s){r[n]=s[a];var{breaked:o,returned:i,value:c}=runScope(t,r);if(o)break;if(i)return{returned:i,value:c}}else error(`${s} is not iterable`);return{}}function switch_block(e,r){const t=scopes[e];var s,n=runLine("pass_input "+t.shift().slice(6),r);let o={};for(let e=0;e<t.length;e++){if(t[e].startsWith("default")?(e++,o=runScope(scopes[t[e]],r)):t[e].startsWith("case")?(s=runLine("pass_input "+t[e].slice(4),r),e++,value(n,r)==value(s,r)&&(o=runScope(scopes[t[e]],r))):error(`invalid keyword ${t[e]} in switch block`),o.breaked)return{value:null};if(o.returned)return o}return{}}function try_block(e,t){const s=scopes[e].slice();let n;try{n=runScope(scopes[s[1]],t)}catch(e){let r=s[2].split(" ")[1];r&&setVar(r.substring(1),stringify(e),t),n=runScope(scopes[s[3]],t)}return n}function if_statement(e,r){const t=scopes[e].slice();let s;e=t.length/2;for(const n of new Array(e)){let e=t.shift();if(e+=" ",e.startsWith("if")){if(e="boolean "+e.slice(2,-1),runLine(e,r)){s=t.shift();break}}else if(e.startsWith("elseif")){if(e="boolean "+e.slice(6,-1),runLine(e,r)){s=t.shift();break}}else{if(e.startsWith("else")){s=t.shift();break}error(`invalid if block \n${e}`)}t.shift()}return s?runScope(scopes[s],r):{}}function basicLoop(e,r){let t=scopes[e].slice();t=t.shift()+" ",t=runLine("number "+t.slice(4,-1).trim(),r);let s=config.max_loop_limit;for(;0<t;){var{breaked:n,returned:o,value:i}=runScope(scopes[e].slice(1),r);if(n)break;if(o)return{returned:o,value:i};if(t--,!s)return error("Maximum loop limit reached");s--}return{}}function whileLoop(e,r){let t=scopes[e].slice();t=t.shift()+" ",t="boolean"+t.slice(5,-1);let s=config.max_loop_limit;for(;runLine(t,r);){var{breaked:n,returned:o,value:i}=runScope(scopes[e].slice(1),r);if(n)break;if(o)return{returned:o,value:i};if(!s)return error("Maximum loop limit reached");s--}return{}}function runLine(e,r){let t=null;for(var s of e=(e=checkForBlocks(e,r)).split("|").filter(Boolean).reverse())s=s.split(" ").filter(Boolean),null!=t&&s.push(t),t=runCommand(r,s);return t}function checkForBlocks(e,r,t=[]){if(!e.includes("<")&&!e.includes(">"))return e;let s=0;for(const o of e){if("<"==o)t.push(s);else if(">"==o){var n=t.pop();if((e=e.slice(0,n)+runLine(e.slice(n+1,s),r)+e.slice(s+1,e.length)).includes(">")){e=checkForBlocks(e,r,t);break}break}s++}return e}function runCommand(t,r){var s=r.shift(),e=r.slice();switch(s){case"break":return"break";case"return":return r[0];case"pass_input":return value(r[0],t)}switch(s){case"exit":process.exit();case"random":return Math.random()}switch(s){case"log":return log(r.reduce((e,r)=>e+=checkLog(r,t),"")),null;case"add":let e=0;return r.some(e=>"number"!=typeof value(e,t))&&(e=""),r.reduce((e,r)=>e+value(r,t),e);case"multiply":return r.reduce((e,r)=>e*=value(r,t),1);case"divide":return r.reduce((e,r)=>e/=value(r,t),1)}let n=checkArg(r.shift(),s,t,e);switch(s){case"get":return get(n,r,t);case"boolean":return Boolean(n);case"neg":return-1*n;case"number":return Number(n);case"not":return!Boolean(n);case"call":const i=[];for(const c of r)i.push(value(c,t));return runFunction(n,i).value;case"round":return Math.round(n);case"floor":return Math.floor(n);case"new":return new_constructor(n,r);case"pop":return arr(n,e[0]).pop();case"shift":return arr(n,e[0]).shift();case"length":return isNumber(n)?error(`cannot read length of number ${n}]`):(isPointer(n)&&(n=pointer(n)),str(n).length);case"reverse":return clone(n,[...arr(n,e[0]).reverse()]);case"last":return last(arr(n,e[0]))}var o=checkArg(r.shift(),s,t,e);switch(s){case"set":return isNumber(n)?error(`cannot set value to Number ${e[0]}`):(isPointer(n)?setValue(n,o,value(r.pop()),r,t):setVar(n,o,t),null);case"pow":return sum=n,Math.pow(n,o);case"reminder":return n%o;case"push":return arr(n,e[0]).push(o),null;case"unshift":return arr(n,e[0]).unshift(o),null;case"includes":return arr(n,e[0]).includes(o);case"indexof":return"string"!=typeof n?error(`cannot get index of ${n}`):(n.startsWith("%array")?pointer(n).map(checkPointer):n).indexOf(o);case"eq":return n==o;case"gt":return n>o;case"lt":return n<o;case"ge":return n>=o;case"le":return n<=o}error(`invalid command or arg - ${s} with arg ${[...e]}`)}function arr(e,r){return!isNumber(e)&&e.startsWith("%array")?pointer(e):error(`${r} is not a array`)}function checkLog(e,r){const t=e;return isPointer(e=value(e,r))&&(e=pointer(e),t.startsWith("%array")?e=`[${e.map(checkLog)}]`:t.startsWith("%object")&&(e="Object")),str(e)}function clone(e,r){var t=hash();return e=e.split("%"),scopes[e[1]][t]=r,`%${e[1]}%${t}`}function get(e,r,t){if(isNumber(e))return error(`expected refrence type got primitive ${e}`);if("string"==typeof e&&!isPointer(e))return e[value(r.shift(),t)];e=e.split("%");let s=scopes[e[1]];r=r.map(e=>value(e,t));let n=e[2];for(let e=0;e<r.length;e++){if("string"==typeof s[n]&&s[n].startsWith("%"))return get(s[n],r.slice(e),t);if(s=s[n],void 0===s)return error(`cannot get proprety ${r[e]} of ${s}`);n=r[e]}return s[n]}function new_constructor(e,r){var t=hash();switch(e){case"Object":return scopes.object[t]={},`%object%${t}`;case"Array":return scopes.array[t]=r,`%array%${t}`;default:return error(`${e} is not a constructor`)}}function setValue(e,r,t,s,n){switch((e=e.split("%"))[1]){case"array":if(!isNumber(r))return error(`expected index to be a number , got ${r}`);break;case"object":if(isNumber(r))return error(`expected key to be string , got ${r}`);break;case"string":return error(`cannot change ${r} of read only strings`)}let o=scopes[e[1]];s=[r,...s].map(e=>value(e,n)),r=e[2];for(let e=0;e<s.length;e++){if("string"==typeof o[r]&&o[r].startsWith("%"))return setValue(o[r],s[e],t,s.slice(e+1),n);if(o=o[r],void 0===o)return error(`cannot set proprety ${s[e]} of ${o}`);r=s[e]}o[r]=t}function setVar(e,r,t){t.hasOwnProperty(e)?t[e]=r:scopes.vars[e]=r}function checkArg(e,r,t,s){if(void 0!==e)return value(e,t);error(`invalid command - ${r} with arg ${s}`)}async function classifyScopes(e,r){let t=["global"],s=0,n,o=!1,i=[],c=!1;for(var a of e){var u,l,p,h,f,d=checkDepth(a);if(a.includes("#")&&(a.includes("##")&&(o=!o),a=a.split("#")[0]),a=checkQuotes(a),a=a.replace("[","<").replace("]",">"),a=a.trim(),!o&&a){if(a.startsWith("import "))await r(a.slice(6));else if(s==d)scopes[last(t)].push(a);else if(s>d){for(const g of Array(s-d))t.pop();scopes[last(t)].push(a)}else s<d&&(n.startsWith("function")?(scopes[last(t)].pop(),l=(l=n.split(" ").filter(Boolean))[1],scopes[l]=[n,a],t.push(l)):n.startsWith("if")?(u=hash(),scopes[last(t)].pop(),scopes[last(t)].push(u),l=hash(),scopes[l]=[a],t.push(l),i.push(u),scopes[u]=[n,l]):n.startsWith("else")?(i.length||error(`invalid if block\n${n}\n${a}`,!0),scopes[last(t)].pop(),p=hash(),t.push(p),scopes[p]=[a],scopes[last(i)].push(n,p),n.startsWith("elseif")||i.pop()):n.startsWith("while")||n.startsWith("loop")||n.startsWith("foreach")?(p=hash(),scopes[last(t)].pop(),scopes[last(t)].push(p),scopes[p]=[n,a],t.push(p)):n.startsWith("try")?(c=hash(),h=hash(),scopes[last(t)].pop(),scopes[last(t)].push(c),scopes[h]=[a],scopes[c]=[n,h],t.push(h)):n.startsWith("catch")?(c||error(`try block not found \n ${n}\n${a}`,!0),h=hash(),scopes[c].push(n,h),scopes[last(t)].pop(),scopes[h]=[a],t.pop(),t.push(h),c=null):n.startsWith("switch")?(f=hash(),scopes[last(t)].pop(),scopes[last(t)].push(f),scopes[f]=[n,a],t.push(f)):n.startsWith("default")||n.startsWith("case")?(f=hash(),scopes[f]=[a],scopes[last(t)].push(f),t.push(f)):error(`invalid scope change\n${n}\n${a}`,!0));s=d,n=a}}}function checkQuotes(e){let r=0,t=!1,s=0;for(const i of e){if("'"==i){if(t){var n=hash(),o=e.slice(0,r);return o+=`%string%${n}`,o+=e.slice(s+1,e.length),scopes.string[n]=stringify(e.slice(r+1,s)),checkQuotes(o)}r=s,t=!t}s++}return e}function checkDepth(e){return("\t"==config.tab?checkTab:checkSpace)(e)}function checkSpace(e){let r=0;for(;e.startsWith(" ");)r++,e=e.substring(1);return Math.floor(r/config.tab)}function checkTab(e){let r=0;for(;e.startsWith("\t");)r++,e=e.substring(1);return r}const{options,words}=checkArgs(process.argv.splice(2)),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}function init(){for(const e of options)if("w"===e)return watchPath(words.shift());run([`import ${words.shift()}`])}async function watchPath(e){log(`WATCHING ${e}...`);const r={...config},t=r.watch_options;watchFile(e,{},async()=>{t.clear_screen&&console.clear(),log(`detected change on ${e}`),await run([`import ${e}`]),config=r})}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.vars={},scopes.object={},scopes.array={},scopes.string={};try{await classifyScopes(e,importFile),runGlobalScope()}catch(e){console.log(e),console.log("FATAL ERROR - terminating program...")}"undefined"==typeof release_mode&&console.log(scopes)}async function importFile(e){e=cwd+"/"+e.trim();if(!existsSync(e))return error(`no such file: ${e}`);e=createReadStream(e);const r=[];for await(const t of createInterface({input:e}))r.push(t);await classifyScopes(r,importFile)}globalThis.config=loadJson("../config.json"),globalThis.log=e=>{console.log(e)},globalThis.error=(e,r)=>{if(!r)throw`[RUNTIME ERROR] ${e}`;throw`[SYNTAX ERROR] ${e}`},init();
