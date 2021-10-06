#! /usr/bin/env node 
globalThis.release_mode=!0;import{createInterface}from"readline";import{readFileSync,existsSync,createReadStream}from"fs";function value(e,r){switch(typeof e){case"string":var s=checkType(checkForVars(e,r));return e.startsWith("-$")?-1*s:s;case"undefined":return error("detected undefined value");case"NaN":return error("detected NaN value");default:return e}}function checkType(e){return 0==e?0:Number(e)?Number(e):"true"==e||"false"!=e&&("null"==e?null:("string"!=typeof e||e.startsWith("%string")&&(e=e.split("%"),e=scopes[e[1]][e[2]]),e))}function checkForVars(e,r){return(e=e.startsWith("-$")?e.substring(1):e).startsWith("$")?(r.hasOwnProperty(e.substring(1))?r:scopes.vars)[e.substring(1)]:e}function stringify(e){return e.split(" ").join("[s]")}function str(e){return"string"!=typeof e?e:e=e.split("[s]").join(" ")}function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}function runGlobalScope(){var e=runScope(scopes.global,scopes.vars)["breaked"];e&&error("invalid break statment in global scope")}function runScope(e,r={}){if(!e)return error("invalid scope");for(var s of e=e.slice())if(s.startsWith("@")){var t=checkForKeyWords(s,r);if(t.returned||t.breaked)return t}else{if(s.startsWith("break"))return{breaked:!0};t=runLine(s,r);if(s.startsWith("return"))return{returned:!0,value:value(t,r)}}return{}}function checkForKeyWords(e,r){const s=globalThis.scopes[e][0];return s.startsWith("while")?whileLoop(e,r):s.startsWith("loop")?basicLoop(e,r):s.startsWith("if")?if_statement(e,r):s.startsWith("try")?try_block(e,r):s.startsWith("switch")?switch_block(e,r):(error(`invalid block ${s}`),{})}function runFunction(e,r){if(config.maximum_call_stack--,!config.maximum_call_stack)return error("maximum call stack exceded");if(!globalThis.scopes.hasOwnProperty(e))return error(`${e} is not a function`);const s=globalThis.scopes[e].slice();let t=s.shift().split(" ").filter(Boolean);t=t.splice(2);const o={};for(const c of t)o[c.substring(1)]=r.shift();var n=runScope(s,o);return n.breaked&&error(`invalid break statment in function ${e}`),n}function switch_block(e,r){const s=scopes[e];var t,o=runLine("pass_input "+s.shift().slice(6),r);let n={};for(let e=0;e<s.length;e++){if(s[e].startsWith("default")?(e++,n=runScope(scopes[s[e]],r)):s[e].startsWith("case")?(t=runLine("pass_input "+s[e].slice(4),r),e++,value(o,r)==value(t,r)&&(n=runScope(scopes[s[e]],r))):error(`invalid keyword ${s[e]} in switch block`),n.breaked)return{value:null};if(n.returned)return n}return{}}function try_block(e,s){const t=scopes[e].slice();let o;try{o=runScope(scopes[t[1]],s)}catch(e){let r=t[2].split(" ")[1];r&&setVar(r.substring(1),stringify(e),s),o=runScope(scopes[t[3]],s)}return o}function if_statement(e,r){const s=scopes[e].slice();let t;e=s.length/2;for(const o of new Array(e)){let e=s.shift();if(e+=" ",e.startsWith("if")){if(e="boolean "+e.slice(2,-1),runLine(e,r)){t=s.shift();break}}else if(e.startsWith("elseif")){if(e="boolean "+e.slice(6,-1),runLine(e,r)){t=s.shift();break}}else if(e.startsWith("else")){t=s.shift();break}s.shift()}return t?runScope(scopes[t],r):{}}function basicLoop(e,r){let s=scopes[e].slice();s=s.shift()+" ",s=runLine("number "+s.slice(4,-1).trim(),r);let t=config.max_loop_limit;for(;0<s;){var{breaked:o,returned:n,value:c}=runScope(scopes[e].slice(1),r);if(o)break;if(n)return{returned:n,value:c};if(s--,!t)return error("Maximum loop limit reached");t--}return{}}function whileLoop(e,r){let s=scopes[e].slice();s=s.shift()+" ",s="boolean"+s.slice(5,-1);let t=config.max_loop_limit;for(;runLine(s,r);){var{breaked:o,returned:n,value:c}=runScope(scopes[e].slice(1),r);if(o)break;if(n)return{returned:n,value:c};if(!t)return error("Maximum loop limit reached");t--}return{}}function runLine(e,r){let s="";for(var t of e=(e=checkForBlocks(e,r)).split(" | ").filter(Boolean).reverse())t=t.trim(),t+=` ${s}`,s=runStatement(t,r);return s}function checkForBlocks(e,r,s=[]){if(!e.includes("[")&&!e.includes("]"))return e;let t=0;for(const n of e){if("["==n)s.push(t);else if("]"==n){var o=s.pop();if((e=e.slice(0,o)+runLine(e.slice(o+1,t),r)+e.slice(t+1,e.length)).includes("]")){e=checkForBlocks(e,r,s);break}break}t++}return e}function runStatement(e,r){return runCommand(r,(e=e.split(" ").filter(Boolean)).shift(),e)}function runCommand(s,r,t){switch(r){case"break":return"break";case"return":case"pass_input":return t[0]}switch(r){case"exit":process.exit();case"random":return Math.random()}switch(r){case"log":return log(t.reduce((e,r)=>e+=str(value(r,s)),"")),null;case"add":let e=0;return t.some(e=>"number"!=typeof value(e,s))&&(e=""),t.reduce((e,r)=>e+value(r,s),e);case"multiply":return t.reduce((e,r)=>e*=value(r,s),1);case"divide":return t.reduce((e,r)=>e/=value(r,s),1)}const o=checkArg(t.shift(),r,s);switch(r){case"boolean":return Boolean(o);case"number":return Number(o);case"not":return!Boolean(o);case"call":const e=[];for(const c of t)e.push(value(c,s));return runFunction(o,e).value;case"round":return Math.round(o);case"floor":return Math.floor(o);case"new":return new_constructor(o,t)}var n=checkArg(t.shift(),r,s,[o]);switch(r){case"get":let e=value(o,s);return e?e.startsWith("%")?(e=e.split("%"),scopes[e[1]][e[2]][n]):error(`${o} is not a Array/Object`):error(`${o} is not a Array/Object`);case"set":return Number(o)||0==o?error(`expected Chars got Number ${o}`):(o.startsWith("%")?setValue(o,n,checkArg(t.shift(),r,s,[o,n])):setVar(o,n,s),null);case"pow":return sum=o,Math.pow(o,n);case"reminder":return o%n;case"eq":return o==n;case"gt":return o>n;case"lt":return o<n;case"ge":return o>=n;case"le":return o<=n}error(`invalid command or arg - ${r} with arg ${[o,n,...t]}`)}function new_constructor(e){var r=hash();switch(e){case"Object":return scopes.object[r]={},`%object%${r}`;case"Array":return scopes.array[r]=[],`%array%${r}`;default:return error(`${e} is not a constructor`)}}function setValue(e,r,s){"array"===(e=e.split("%").filter(Boolean))[0]&&(Number(r)||0==r||error(`expected index to be a number , got ${r}`)),scopes[e[0]][e[1]][r]=s}function setVar(e,r,s){s.hasOwnProperty(e)?s[e]=r:scopes.vars[e]=r}function checkArg(e,r,s,t=[]){return Number(e)||0==e?Number(e):void 0!==e?value(e,s):void error(`unknown command - ${r} with arg [${[e,...t]}]`)}async function classifyScopes(e,r){let s=["global"],t=0,o,n=!1,c=[],i=!1;for(var a of e){var l,u,p,h,f,d=checkDepth(a);if(a.includes("#")&&(a.includes("##")&&(n=!n),a=a.split("#")[0]),a=checkQuotes(a),a=a.trim(),!n&&a){if(a.startsWith("import "))await r(a.slice(6));else if(t==d)scopes[last(s)].push(a);else if(t>d){for(const b of Array(t-d))s.pop();scopes[last(s)].push(a)}else t<d&&(o.startsWith("function")?(scopes[last(s)].pop(),u=(u=o.split(" ").filter(Boolean))[1],scopes[u]=[o,a],s.push(u)):o.startsWith("if")?(l=hash(),scopes[last(s)].pop(),scopes[last(s)].push(l),u=hash(),scopes[u]=[a],s.push(u),c.push(l),scopes[l]=[o,u]):o.startsWith("else")?(c.length||error(`invalid if block\n${o}\n${a}`,!0),scopes[last(s)].pop(),p=hash(),s.push(p),scopes[p]=[a],scopes[last(c)].push(o,p),o.startsWith("elseif")||c.pop()):o.startsWith("while")||o.startsWith("loop")?(p=hash(),scopes[last(s)].pop(),scopes[last(s)].push(p),scopes[p]=[o,a],s.push(p)):o.startsWith("try")?(i=hash(),h=hash(),scopes[last(s)].pop(),scopes[last(s)].push(i),scopes[h]=[a],scopes[i]=[o,h],s.push(h)):o.startsWith("catch")?(i||error(`try block not found \n ${o}\n${a}`,!0),h=hash(),scopes[i].push(o,h),scopes[last(s)].pop(),scopes[h]=[a],s.pop(),s.push(h),i=null):o.startsWith("switch")?(f=hash(),scopes[last(s)].pop(),scopes[last(s)].push(f),scopes[f]=[o,a],s.push(f)):o.startsWith("default")||o.startsWith("case")?(f=hash(),scopes[f]=[a],scopes[last(s)].push(f),s.push(f)):error(`invalid scope change\n${o}\n${a}`,!0));t=d,o=a}}}function checkQuotes(e){let r=0,s=!1,t=0;for(const c of e){if("'"==c){if(s){var o=hash(),n=e.slice(0,r);return n+=`%string%${o}`,n+=e.slice(t+1,e.length),scopes.string[o]=stringify(e.slice(r+1,t)),checkQuotes(n)}r=t,s=!s}t++}return e}function checkDepth(e){return("\t"==config.tab?checkTab:checkSpace)(e)}function checkSpace(e){let r=0;for(;e.startsWith(" ");)r++,e=e.substring(1);return Math.floor(r/config.tab)}function checkTab(e){let r=0;for(;e.startsWith("\t");)r++,e=e.substring(1);return console.log(r),r}const args=process.argv.splice(2),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}function init(){run([`import ${args.shift()}`])}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.vars={},scopes.object={},scopes.array={},scopes.string={};try{await classifyScopes(e,importFile),runGlobalScope()}catch(e){console.log(e),console.log("FATAL ERROR - terminating program...")}"undefined"==typeof release_mode&&console.log(scopes)}async function importFile(e){e=cwd+"/"+e.trim();if(!existsSync(e))return error(`path: ${e} doesnot exist`);e=createReadStream(e);const r=[];for await(const s of createInterface({input:e}))r.push(s);await classifyScopes(r,importFile)}globalThis.config=loadJson("../config.json"),globalThis.log=e=>{console.log(e)},globalThis.error=(e,r)=>{if(!r)throw`[RUNTIME ERROR] ${e}`;throw`[SYNTAX ERROR] ${e}`},init();
