#! /usr/bin/env node 
globalThis.release_mode=!0;import{createInterface}from"readline";import{readFileSync,watchFile,existsSync,createReadStream}from"fs";function value(e,r){switch(typeof e){case"string":var t=checkType(checkForVars(e,r));return e.startsWith("-$")?-1*t:t;case"undefined":return error("detected undefined value");case"NaN":return error("detected NaN value");default:return e}}function checkType(e){return 0==e?0:Number(e)?Number(e):"true"==e||"false"!=e&&("null"==e?null:("string"!=typeof e||e.startsWith("%string")&&(e=e.split("%"),e=scopes[e[1]][e[2]]),e))}function checkForVars(e,r){return(e=e.startsWith("-$")?e.substring(1):e).startsWith("$")?(r.hasOwnProperty(e.substring(1))?r:scopes.vars)[e.substring(1)]:e}function checkArgs(e){const r=[],t=[];for(const s of e)s.startsWith("-")?r.push(s.substring(1)):t.push(s);return{options:r,words:t}}function stringify(e){return e.split(" ").join("[s]")}function str(e){return"string"!=typeof e?e:e=e.split("[s]").join(" ")}function pointer(e){return e=e.split("%"),scopes[e[1]][e[2]]}function isPointer(e){return"string"==typeof e&&e.startsWith("%")}function isNumber(e){return Number(e)||0==e}function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}function runGlobalScope(){var e=runScope(scopes.global,scopes.vars)["breaked"];e&&error("invalid break statment in global scope")}function runScope(e,r={}){if(!e)return error("invalid scope");for(var t of e=e.slice())if(t.startsWith("@")){var s=checkForKeyWords(t,r);if(s.returned||s.breaked)return s}else{if(t.startsWith("break"))return{breaked:!0};s=runLine(t,r);if(t.startsWith("return"))return{returned:!0,value:value(s,r)}}return{}}function checkForKeyWords(e,r){const t=globalThis.scopes[e][0];return t.startsWith("while")?whileLoop(e,r):t.startsWith("loop")?basicLoop(e,r):t.startsWith("if")?if_statement(e,r):t.startsWith("try")?try_block(e,r):t.startsWith("switch")?switch_block(e,r):t.startsWith("foreach")?foreach_block(e,r):(error(`invalid block ${t}`),{})}function runFunction(e,r){if(config.maximum_call_stack--,!config.maximum_call_stack)return error("maximum call stack exceded");if(!globalThis.scopes.hasOwnProperty(e))return error(`${e} is not a function`);const t=globalThis.scopes[e].slice();let s=t.shift().split(" ").filter(Boolean);s=s.splice(2);const o={};for(const c of s)o[c.substring(1)]=r.shift();var n=runScope(t,o);return n.breaked&&error(`invalid break statment in function ${e}`),n}function foreach_block(e,r){const t=scopes[e].slice();let s=t.shift().split(" ");var o=s[1].slice(1);if(s=runLine("pass_input "+s.splice(2).join(" "),r),isPointer(s)&&(s=pointer(s)),"object"==typeof s)for(const a in s){r[o]=s[a];var{breaked:n,returned:c,value:i}=runScope(t,r);if(n)break;if(c)return{returned:c,value:i}}else error(`${s} is not iterable`);return{}}function switch_block(e,r){const t=scopes[e];var s,o=runLine("pass_input "+t.shift().slice(6),r);let n={};for(let e=0;e<t.length;e++){if(t[e].startsWith("default")?(e++,n=runScope(scopes[t[e]],r)):t[e].startsWith("case")?(s=runLine("pass_input "+t[e].slice(4),r),e++,value(o,r)==value(s,r)&&(n=runScope(scopes[t[e]],r))):error(`invalid keyword ${t[e]} in switch block`),n.breaked)return{value:null};if(n.returned)return n}return{}}function try_block(e,t){const s=scopes[e].slice();let o;try{o=runScope(scopes[s[1]],t)}catch(e){let r=s[2].split(" ")[1];r&&setVar(r.substring(1),stringify(e),t),o=runScope(scopes[s[3]],t)}return o}function if_statement(e,r){const t=scopes[e].slice();let s;e=t.length/2;for(const o of new Array(e)){let e=t.shift();if(e+=" ",e.startsWith("if")){if(e="boolean "+e.slice(2,-1),runLine(e,r)){s=t.shift();break}}else if(e.startsWith("elseif")){if(e="boolean "+e.slice(6,-1),runLine(e,r)){s=t.shift();break}}else if(e.startsWith("else")){s=t.shift();break}t.shift()}return s?runScope(scopes[s],r):{}}function basicLoop(e,r){let t=scopes[e].slice();t=t.shift()+" ",t=runLine("number "+t.slice(4,-1).trim(),r);let s=config.max_loop_limit;for(;0<t;){var{breaked:o,returned:n,value:c}=runScope(scopes[e].slice(1),r);if(o)break;if(n)return{returned:n,value:c};if(t--,!s)return error("Maximum loop limit reached");s--}return{}}function whileLoop(e,r){let t=scopes[e].slice();t=t.shift()+" ",t="boolean"+t.slice(5,-1);let s=config.max_loop_limit;for(;runLine(t,r);){var{breaked:o,returned:n,value:c}=runScope(scopes[e].slice(1),r);if(o)break;if(n)return{returned:n,value:c};if(!s)return error("Maximum loop limit reached");s--}return{}}function runLine(e,r){let t=null;for(var s of e=(e=checkForBlocks(e,r)).split("|").filter(Boolean).reverse())s=s.split(" ").filter(Boolean),null!=t&&s.push(t),t=runCommand(r,s);return t}function checkForBlocks(e,r,t=[]){if(!e.includes("<")&&!e.includes(">"))return e;let s=0;for(const n of e){if("<"==n)t.push(s);else if(">"==n){var o=t.pop();if((e=e.slice(0,o)+runLine(e.slice(o+1,s),r)+e.slice(s+1,e.length)).includes(">")){e=checkForBlocks(e,r,t);break}break}s++}return e}function runCommand(t,r){var s=r.shift(),e=r.slice();switch(s){case"break":return"break";case"return":return r[0];case"pass_input":return value(r[0],t)}switch(s){case"exit":process.exit();case"random":return Math.random()}switch(s){case"log":return log(r.reduce((e,r)=>e+=checkLog(r,t),"")),null;case"add":let e=0;return r.some(e=>"number"!=typeof value(e,t))&&(e=""),r.reduce((e,r)=>e+value(r,t),e);case"multiply":return r.reduce((e,r)=>e*=value(r,t),1);case"divide":return r.reduce((e,r)=>e/=value(r,t),1)}var o=checkArg(r.shift(),s,t,e);switch(s){case"get":return get(o,r,t);case"boolean":return Boolean(o);case"number":return Number(o);case"not":return!Boolean(o);case"call":const c=[];for(const i of r)c.push(value(i,t));return runFunction(o,c).value;case"round":return Math.round(o);case"floor":return Math.floor(o);case"new":return new_constructor(o);case"pop":return arr(o,e[0]).pop();case"shift":return arr(o,e[0]).shift();case"length":return arr(o,e[0]).length;case"reverse":return clone(o,[...arr(o,e[0]).reverse()]);case"last":return last(arr(o,e[0]))}var n=checkArg(r.shift(),s,t,e);switch(s){case"set":return isNumber(o)?error(`cannot set value to Number ${e[0]}`):(isPointer(o)?setValue(o,n,value(r.pop()),r,t):setVar(o,n,t),null);case"pow":return sum=o,Math.pow(o,n);case"reminder":return o%n;case"push":return arr(o,e[0]).push(n),null;case"unshift":return arr(o,e[0]).unshift(n),null;case"includes":return arr(o,e[0]).includes(n);case"eq":return o==n;case"gt":return n<o;case"lt":return o<n;case"ge":return n<=o;case"le":return o<=n}error(`invalid command or arg - ${s} with arg ${[...e]}`)}function arr(e,r){return!isNumber(e)&&e.startsWith("%array")?pointer(e):error(`${r} is not a array`)}function checkLog(e,r){return str(e=isPointer(e=value(e,r))?pointer(e):e)}function clone(e,r){var t=hash();return e=e.split("%"),scopes[e[1]][t]=r,`%${e[1]}%${t}`}function get(e,r,t){if(isNumber(e)||!e.startsWith("%"))return error(`expected refrence type got primitive ${e}`);e=e.split("%");let s=scopes[e[1]];r=r.map(e=>value(e,t));let o=e[2];for(let e=0;e<r.length;e++){if("string"==typeof s[o]&&s[o].startsWith("%"))return get(s[o],r.slice(e),t);if(s=s[o],void 0===s)return error(`cannot get proprety ${r[e]} of ${s}`);o=r[e]}return s[o]}function new_constructor(e){var r=hash();switch(e){case"Object":return scopes.object[r]={},`%object%${r}`;case"Array":return scopes.array[r]=[],`%array%${r}`;default:return error(`${e} is not a constructor`)}}function setValue(e,r,t,s,o){switch((e=e.split("%"))[1]){case"array":if(!isNumber(r))return error(`expected index to be a number , got ${r}`);break;case"object":if(isNumber(r))return error(`expected key to be string , got ${r}`);break;case"string":return error(`cannot change ${r} of read only strings`)}let n=scopes[e[1]];s=[r,...s].map(e=>value(e,o)),r=e[2];for(let e=0;e<s.length;e++){if("string"==typeof n[r]&&n[r].startsWith("%"))return setValue(n[r],s[e],t,s.slice(e+1),o);if(n=n[r],void 0===n)return error(`cannot set proprety ${s[e]} of ${n}`);r=s[e]}n[r]=t}function setVar(e,r,t){t.hasOwnProperty(e)?t[e]=r:scopes.vars[e]=r}function checkArg(e,r,t,s){return isNumber(e)?Number(e):void 0!==e?value(e,t):void error(`invalid command - ${r} with arg ${s}`)}async function classifyScopes(e,r){let t=["global"],s=0,o,n=!1,c=[],i=!1;for(var a of e){var u,l,p,h,f,d=checkDepth(a);if(a.includes("#")&&(a.includes("##")&&(n=!n),a=a.split("#")[0]),a=checkQuotes(a),a=a.replace("[","<").replace("]",">"),a=a.trim(),!n&&a){if(a.startsWith("import "))await r(a.slice(6));else if(s==d)scopes[last(t)].push(a);else if(s>d){for(const b of Array(s-d))t.pop();scopes[last(t)].push(a)}else s<d&&(o.startsWith("function")?(scopes[last(t)].pop(),l=(l=o.split(" ").filter(Boolean))[1],scopes[l]=[o,a],t.push(l)):o.startsWith("if")?(u=hash(),scopes[last(t)].pop(),scopes[last(t)].push(u),l=hash(),scopes[l]=[a],t.push(l),c.push(u),scopes[u]=[o,l]):o.startsWith("else")?(c.length||error(`invalid if block\n${o}\n${a}`,!0),scopes[last(t)].pop(),p=hash(),t.push(p),scopes[p]=[a],scopes[last(c)].push(o,p),o.startsWith("elseif")||c.pop()):o.startsWith("while")||o.startsWith("loop")||o.startsWith("foreach")?(p=hash(),scopes[last(t)].pop(),scopes[last(t)].push(p),scopes[p]=[o,a],t.push(p)):o.startsWith("try")?(i=hash(),h=hash(),scopes[last(t)].pop(),scopes[last(t)].push(i),scopes[h]=[a],scopes[i]=[o,h],t.push(h)):o.startsWith("catch")?(i||error(`try block not found \n ${o}\n${a}`,!0),h=hash(),scopes[i].push(o,h),scopes[last(t)].pop(),scopes[h]=[a],t.pop(),t.push(h),i=null):o.startsWith("switch")?(f=hash(),scopes[last(t)].pop(),scopes[last(t)].push(f),scopes[f]=[o,a],t.push(f)):o.startsWith("default")||o.startsWith("case")?(f=hash(),scopes[f]=[a],scopes[last(t)].push(f),t.push(f)):error(`invalid scope change\n${o}\n${a}`,!0));s=d,o=a}}}function checkQuotes(e){let r=0,t=!1,s=0;for(const c of e){if("'"==c){if(t){var o=hash(),n=e.slice(0,r);return n+=`%string%${o}`,n+=e.slice(s+1,e.length),scopes.string[o]=stringify(e.slice(r+1,s)),checkQuotes(n)}r=s,t=!t}s++}return e}function checkDepth(e){return("\t"==config.tab?checkTab:checkSpace)(e)}function checkSpace(e){let r=0;for(;e.startsWith(" ");)r++,e=e.substring(1);return Math.floor(r/config.tab)}function checkTab(e){let r=0;for(;e.startsWith("\t");)r++,e=e.substring(1);return r}const{options,words}=checkArgs(process.argv.splice(2)),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}function init(){for(const e of options)if("w"===e)return watchPath(words.shift());run([`import ${words.shift()}`])}async function watchPath(e){log(`WATCHING ${e}...`);const r={...config},t=r.watch_options;watchFile(e,{},async()=>{t.clear_screen&&console.clear(),log(`detected change on ${e}`),await run([`import ${e}`]),config=r})}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.vars={},scopes.object={},scopes.array={},scopes.string={};try{await classifyScopes(e,importFile),runGlobalScope()}catch(e){console.log(e),console.log("FATAL ERROR - terminating program...")}"undefined"==typeof release_mode&&console.log(scopes)}async function importFile(e){e=cwd+"/"+e.trim();if(!existsSync(e))return error(`no such file: ${e}`);e=createReadStream(e);const r=[];for await(const t of createInterface({input:e}))r.push(t);await classifyScopes(r,importFile)}globalThis.config=loadJson("../config.json"),globalThis.log=e=>{console.log(e)},globalThis.error=(e,r)=>{if(!r)throw`[RUNTIME ERROR] ${e}`;throw`[SYNTAX ERROR] ${e}`},init();
