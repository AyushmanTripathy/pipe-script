#! /usr/bin/env node
import{readFileSync,createReadStream}from"fs";import{createInterface}from"readline";function value(e,s){switch(typeof e){case"string":var r=checkType(checkForVars(e,s));return e.startsWith("-$")?-1*r:r;case"undefined":return error("detected undefined value");case"NaN":return error("detected NaN value");default:return e}}function checkType(e){return 0==e?0:Number(e)?Number(e):"true"==e||"false"!=e&&("null"==e?null:e)}function checkForVars(e,s){return(e=e.startsWith("-$")?e.substring(1):e).startsWith("$")?(s.hasOwnProperty(e.substring(1))?s:scopes.vars)[e.substring(1)]:e}function hash(){return hash_code++,`@${hash_code}`}function last(e){return e[e.length-1]}function runScope(e,s={}){for(var r of e=e.slice())if(r.startsWith("@")){const o=globalThis.scopes[r][0];o.startsWith("while")?whileLoop(r,s):o.startsWith("loop")?basicLoop(r,s):o.startsWith("if")&&if_statement(r,s)}else{var t=runLine(r,s);if(r.startsWith("return"))return value(t,s)}return null}function runFunction(e,s){if(!globalThis.scopes.hasOwnProperty(e))return error(`${e} is not a function`);const r=globalThis.scopes[e].slice();let t=r.shift().split(" ").filter(Boolean);t=t.splice(2);const o={};for(const n of t)o[n.substring(1)]=s.shift();return runScope(r,o)}function if_statement(e,s){const r=scopes[e].slice();let t;e=r.length/2;for(const o of new Array(e)){let e=r.shift();if(e+=" ",e.startsWith("if")){if(e="boolean "+e.slice(2,-1),runLine(e,s)){t=r.shift();break}}else if(e.startsWith("elseif")){if(e="boolean "+e.slice(6,-1),runLine(e,s)){t=r.shift();break}}else if(e.startsWith("else")){t=r.shift();break}r.shift()}t&&runScope(scopes[t],s)}function basicLoop(e,s){let r=scopes[e].slice();r=r.shift()+" ",r=value(r.slice(4,-1).trim(),s);let t=config.max_loop_limit;for(;0<r;){if(runScope(scopes[e].slice(1),s),r--,!t)return error("stack overflow");t--}}function whileLoop(e,s){let r=scopes[e].slice();r=r.shift()+" ",r="boolean"+r.slice(5,-1);let t=config.max_loop_limit;for(;runLine(r,s);){if(runScope(scopes[e].slice(1),s),!t)return error("stack overflow");t--}}function runLine(e,s){let r="";for(var t of e=(e=checkForBlocks(e,s)).split(" | ").reverse()){if(t=t.trim(),t.startsWith("return"))return""!=r?r:t.split(" ").pop();t+=` ${r}`,r=runStatement(t,s)}return r}function checkForBlocks(e,s,r=[]){if(!e.includes("[")&&!e.includes("]"))return e;let t=0;for(const n of e){if("["==n)r.push(t);else if("]"==n){var o=r.pop();if((e=e.slice(0,o)+runLine(e.slice(o+1,t),s)+e.slice(t+1,e.length)).includes("]")){e=checkForBlocks(e,s,r);break}break}t++}return e}function runStatement(e,s){return runCommand(s,(e=e.split(" ").filter(Boolean)).shift(),e)}function runCommand(r,s,t){switch(s){case"exit":process.exit();case"random":return Math.random();case"Object":return hash_num=hash(),scopes.object[`@${hash_num}`]={},`%object%@${hash_num}`;case"Array":return hash_num=hash(),scopes.array[`@${hash_num}`]=[],`%array%@${hash_num}`}switch(s){case"log":return log(t.reduce((e,s)=>e+=value(s,r),"")),null;case"add":let e=0;return t.some(e=>"number"!=typeof value(e,r))&&(e=""),t.reduce((e,s)=>e+value(s,r),e);case"multiply":return t.reduce((e,s)=>e*=value(s,r),1);case"divide":return t.reduce((e,s)=>e/=value(s,r),1)}const o=checkArg(t.shift(),s,r);switch(s){case"boolean":return Boolean(o);case"not":return!Boolean(o);case"call":const e=[];for(const c of t)e.push(value(c,r));return runFunction(o,e);case"round":return Math.round(o);case"floor":return Math.floor(o)}var n=checkArg(t.shift(),s,r,[o]);switch(s){case"get":let e=value(o,r);return e||error(`${o} is not defined (Array/Object)`),e=e.split("%"),scopes[e[1]][e[2]][n];case"set":return Number(o)||0==o?error(`expected Chars got Number ${o}`):(o.startsWith("%")?setValue(o,n,checkArg(t.shift(),s,r,[o,n])):setVar(o,n,r),null);case"pow":return sum=o,Math.pow(o,n);case"reminder":return o%n;case"eq":return o==n;case"gt":return o>n;case"lt":return o<n;case"ge":return o>=n;case"le":return o<=n}error(`invalid command - ${s} with arg ${[o,n,...t]}`)}function setValue(e,s,r){"array"===(e=e.split("%").filter(Boolean))[0]&&(Number(s)||0==s||error(`expected index to be a number , got ${s}`)),scopes[e[0]][e[1]][s]=r}function setVar(e,s,r){r.hasOwnProperty(e)?r[e]=s:scopes.vars[e]=s}function checkArg(e,s,r,t=[]){return Number(e)||0==e?Number(e):void 0!==e?value(e,r):void error(`invalid command - ${s} with arg ${[e,...t]}`)}async function classifyScopes(e,s){let r=["global"],t=0,o=null,n=!1;for(var c of e){var a,i,l,u=checkDepth(c);if(c.includes("#")&&(c.includes("##")&&(n=!n),c=c.split("#")[0]),c=c.trim(),!n&&c){const h=scopes[last(r)].slice(-1).pop();if(c.startsWith("import "))console.log(s),await s(c.slice(6));else if(t==u)scopes[last(r)].push(c);else if(t>u){for(const p of Array(t-u))r.pop();scopes[last(r)].push(c)}else t<u&&(h.startsWith("function")?(scopes[last(r)].pop(),i=(i=h.split(" ").filter(Boolean))[1],scopes[i]=[h,c],r.push(i)):h.startsWith("if")?(a=hash(),scopes[last(r)].pop(),scopes[last(r)].push(`${a}`),i=hash(),scopes[i]=[c],r.push(i),o=a,scopes[a]=[h,i]):h.startsWith("else")?(o||error(`invalid if statment - ${h}`),scopes[last(r)].pop(),l=hash(),r.push(l),scopes[l]=[c],scopes[o].push(h,l),h.startsWith("elseif")||(o=null)):(l=hash(),scopes[last(r)].pop(),scopes[last(r)].push(`${l}`),scopes[l]=[h,c],r.push(l)));t=u}}}function checkDepth(e){let s=0;for(;e.startsWith(" ");)s++,e=e.substring(1);return Math.floor(s/config.tab)}const args=process.argv.splice(2),cwd=process.cwd();function loadJson(e){e=readFileSync(new URL(e,import.meta.url));return JSON.parse(e)}async function run(e){globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.vars={},scopes.object={},scopes.array={},await classifyScopes(e,importFile),runScope(scopes.global,scopes.vars),console.log(scopes)}async function importFile(e){e=cwd+"/"+e.trim(),e=createReadStream(e);const s=[];for await(const r of createInterface({input:e}))s.push(r);await classifyScopes(s,importFile)}globalThis.config=loadJson("../config.json"),run([`import ${args.shift()}`]),globalThis.log=e=>{console.log(e)},globalThis.error=e=>{console.log("[31m",e,"[31m"),process.exit()};export default run;
