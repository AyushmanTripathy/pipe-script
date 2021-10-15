var app=function(){"use strict";function t(){}function e(t,e){for(const n in e)t[n]=e[n];return t}function n(t){return t()}function r(){return Object.create(null)}function s(t){t.forEach(n)}function o(t){return"function"==typeof t}function i(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,e){const n={};e=new Set(e);for(const r in t)e.has(r)||"$"===r[0]||(n[r]=t[r]);return n}function l(t,e){t.appendChild(e)}function a(t,e,n){t.insertBefore(e,n||null)}function u(t){t.parentNode.removeChild(t)}function f(t){return document.createElement(t)}function p(){return t=" ",document.createTextNode(t);var t}function d(t,e,n,r){return t.addEventListener(e,n,r),()=>t.removeEventListener(e,n,r)}function h(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function g(t,e){t.value=null==e?"":e}let b;function m(t){b=t}const y=[],$=[],v=[],k=[],w=Promise.resolve();let x=!1;function _(t){v.push(t)}let N=!1;const W=new Set;function T(){if(!N){N=!0;do{for(let t=0;t<y.length;t+=1){const e=y[t];m(e),E(e.$$)}for(m(null),y.length=0;$.length;)$.pop()();for(let t=0;t<v.length;t+=1){const e=v[t];W.has(e)||(W.add(e),e())}v.length=0}while(y.length);for(;k.length;)k.pop()();x=!1,N=!1,W.clear()}}function E(t){if(null!==t.fragment){t.update(),s(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(_)}}const O=new Set;function C(t,e){t&&t.i&&(O.delete(t),t.i(e))}function A(t,e,n,r){if(t&&t.o){if(O.has(t))return;O.add(t),undefined.c.push((()=>{O.delete(t),r&&(n&&t.d(1),r())})),t.o(e)}}function M(t){t&&t.c()}function S(t,e,r,i){const{fragment:c,on_mount:l,on_destroy:a,after_update:u}=t.$$;c&&c.m(e,r),i||_((()=>{const e=l.map(n).filter(o);a?a.push(...e):s(e),t.$$.on_mount=[]})),u.forEach(_)}function j(t,e){const n=t.$$;null!==n.fragment&&(s(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function R(t,e){-1===t.$$.dirty[0]&&(y.push(t),x||(x=!0,w.then(T)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function L(e,n,o,i,c,l,a,f=[-1]){const p=b;m(e);const d=e.$$={fragment:null,ctx:null,props:l,update:t,not_equal:c,bound:r(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(p?p.$$.context:n.context||[]),callbacks:r(),dirty:f,skip_bound:!1,root:n.target||p.$$.root};a&&a(d.root);let h=!1;if(d.ctx=o?o(e,n.props||{},((t,n,...r)=>{const s=r.length?r[0]:n;return d.ctx&&c(d.ctx[t],d.ctx[t]=s)&&(!d.skip_bound&&d.bound[t]&&d.bound[t](s),h&&R(e,t)),n})):[],d.update(),h=!0,s(d.before_update),d.fragment=!!i&&i(d.ctx),n.target){if(n.hydrate){const t=function(t){return Array.from(t.childNodes)}(n.target);d.fragment&&d.fragment.l(t),t.forEach(u)}else d.fragment&&d.fragment.c();n.intro&&C(e.$$.fragment),S(e,n.target,n.anchor,n.customElement),T()}m(p)}class B{$destroy(){j(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}function P(t,e,n){switch(typeof t){case"string":const r=function(t){if(0==t)return 0;if(Number(t))return Number(t);if("true"==t)return!0;if("false"==t)return!1;if("null"==t)return null;if("string"!=typeof t)return t;t.startsWith("%string")&&(t=t.split("%"),t=scopes[t[1]][t[2]]);return t}(function(t,e){t.startsWith("-$")&&(t=t.substring(1));if(t.startsWith("$"))return e.hasOwnProperty(t.substring(1))?e[t.substring(1)]:scopes.vars[t.substring(1)];return t}(t,e));return t.startsWith("-$")?-1*r:r;case"undefined":return error(`${n} is undefined`);case"NaN":return error("detected NaN value");default:return t}}function D(t){return t.split(" ").join("[s]")}function K(t){return t=t.split("%"),scopes[t[1]][t[2]]}function q(t){return"string"==typeof t&&t.startsWith("%")}function z(t){return Number(t)||0==t}function H(){return hash_code++,`@${hash_code}`}function I(t){return t[t.length-1]}function U(t,e={}){if(!t)return error("invalid scope");t=t.slice();for(let n of t)if(n.startsWith("@")){const t=V(n,e);if(t.returned||t.breaked)return t}else{if(n.startsWith("break"))return{breaked:!0};const t=X(n,e);if(n.startsWith("return"))return{returned:!0,value:P(t,e)}}return{}}function V(t,e){const n=globalThis.scopes[t][0];return n.startsWith("while")?function(t,e){let n=scopes[t].slice();n=n.shift()+" ",n="boolean"+n.slice(5,-1);let r=config.max_loop_limit;for(;X(n,e);){const{breaked:n,returned:s,value:o}=U(scopes[t].slice(1),e);if(n)break;if(s)return{returned:s,value:o};if(!r)return error("Maximum loop limit reached");r--}return{}}(t,e):n.startsWith("loop")?function(t,e){let n=scopes[t].slice();n=n.shift()+" ",n=X("number "+n.slice(4,-1).trim(),e);let r=config.max_loop_limit;for(;n>0;){const{breaked:s,returned:o,value:i}=U(scopes[t].slice(1),e);if(s)break;if(o)return{returned:o,value:i};if(n--,!r)return error("Maximum loop limit reached");r--}return{}}(t,e):n.startsWith("if")?function(t,e){const n=scopes[t].slice();let r;const s=n.length/2;for(const t of new Array(s)){let t=n.shift();if(t+=" ",t.startsWith("if")){if(t="boolean "+t.slice(2,-1),X(t,e)){r=n.shift();break}}else if(t.startsWith("elseif")){if(t="boolean "+t.slice(6,-1),X(t,e)){r=n.shift();break}}else if(t.startsWith("else")){r=n.shift();break}n.shift()}return r?U(scopes[r],e):{}}(t,e):n.startsWith("try")?function(t,e){const n=scopes[t].slice();let r;try{r=U(scopes[n[1]],e)}catch(t){let s=n[2].split(" ")[1];s&&Q(s.substring(1),D(t),e),r=U(scopes[n[3]],e)}return r}(t,e):n.startsWith("switch")?function(t,e){const n=scopes[t],r=X("pass_input "+n.shift().slice(6),e);let s={};for(let t=0;t<n.length;t++){if(n[t].startsWith("default"))t++,s=U(scopes[n[t]],e);else if(n[t].startsWith("case")){const o=X("pass_input "+n[t].slice(4),e);t++,P(r,e)==P(o,e)&&(s=U(scopes[n[t]],e))}else error(`invalid keyword ${n[t]} in switch block`);if(s.breaked)return{value:null};if(s.returned)return s}return{}}(t,e):n.startsWith("foreach")?function(t,e){const n=scopes[t].slice();let r=n.shift().split(" "),s=r[1].slice(1);r=X("pass_input "+r.splice(2).join(" "),e),q(r)&&(r=K(r));if("object"==typeof r)for(const t in r){e[s]=r[t];const{breaked:o,returned:i,value:c}=U(n,e);if(o)break;if(i)return{returned:i,value:c}}else error(`${r} is not iterable`);return{}}(t,e):(error(`invalid block ${n}`),{})}function X(t,e){t=(t=F(t,e)).split("|").filter(Boolean).reverse();let n=null;for(let r of t)r=r.split(" ").filter(Boolean),null!=n&&r.push(n),n=J(e,r);return n}function F(t,e,n=[]){if(!t.includes("<")&&!t.includes(">"))return t;let r=0;for(const s of t){if("<"==s)n.push(r);else if(">"==s){const s=n.pop();if((t=t.slice(0,s)+X(t.slice(s+1,r),e)+t.slice(r+1,t.length)).includes(">")){t=F(t,e,n);break}break}r++}return t}function J(t,e){const n=e.shift(),r=e.slice();switch(n){case"break":return"break";case"return":return e[0];case"pass_input":return P(e[0],t)}switch(n){case"exit":process.exit();case"random":return Math.random()}switch(n){case"log":return log(e.reduce(((e,n)=>e+function(t,e){q(t=P(t,e))&&(t=K(t));return function(t){return"string"!=typeof t?t:t=t.split("[s]").join(" ")}(t)}(n,t)),"")),null;case"add":let n=0;return e.some((e=>"number"!=typeof P(e,t)))&&(n=""),e.reduce(((e,n)=>e+P(n,t)),n);case"multiply":return e.reduce(((e,n)=>e*P(n,t)),1);case"divide":return e.reduce(((e,n)=>e/P(n,t)),1)}const s=tt(e.shift(),n,t,r);switch(n){case"get":return Z(s,e,t);case"boolean":return Boolean(s);case"number":return Number(s);case"not":return!Boolean(s);case"call":const n=[];for(const r of e)n.push(P(r,t));return function(t,e){if(config.maximum_call_stack--,!config.maximum_call_stack)return error("maximum call stack exceded");if(!globalThis.scopes.hasOwnProperty(t))return error(`${t} is not a function`);const n=globalThis.scopes[t].slice();let r=n.shift().split(" ").filter(Boolean);r=r.splice(2);const s={};for(const t of r)s[t.substring(1)]=e.shift();const o=U(n,s);return o.breaked&&error(`invalid break statment in function ${t}`),o}(s,n).value;case"round":return Math.round(s);case"floor":return Math.floor(s);case"new":return function(t){const e=H();switch(t){case"Object":return scopes.object[e]={},`%object%${e}`;case"Array":return scopes.array[e]=[],`%array%${e}`;default:return error(`${t} is not a constructor`)}}(s);case"pop":return Y(s,r[0]).pop();case"shift":return Y(s,r[0]).shift();case"length":return Y(s,r[0]).length;case"reverse":return function(t,e){const n=H();return t=t.split("%"),scopes[t[1]][n]=e,`%${t[1]}%${n}`}(s,[...Y(s,r[0]).reverse()]);case"last":return I(Y(s,r[0]))}const o=tt(e.shift(),n,t,r);switch(n){case"set":return z(s)?error(`cannot set value to Number ${r[0]}`):(q(s)?G(s,o,P(e.pop()),e,t):Q(s,o,t),null);case"pow":return sum=s,Math.pow(s,o);case"reminder":return s%o;case"push":return Y(s,r[0]).push(o),null;case"unshift":return Y(s,r[0]).unshift(o),null;case"includes":return Y(s,r[0]).includes(o);case"eq":return s==o;case"gt":return s>o;case"lt":return s<o;case"ge":return s>=o;case"le":return s<=o}error(`invalid command or arg - ${n} with arg ${[...r]}`)}function Y(t,e){return z(t)?error(`${e} is not a array`):t.startsWith("%array")?K(t):error(`${e} is not a array`)}function Z(t,e,n){if(z(t)||!t.startsWith("%"))return error(`expected refrence type got primitive ${t}`);t=t.split("%");let r=scopes[t[1]];e=e.map((t=>P(t,n)));let s=t[2];for(let t=0;t<e.length;t++){if("string"==typeof r[s]&&r[s].startsWith("%"))return Z(r[s],e.slice(t),n);if(r=r[s],void 0===r)return error(`cannot get proprety ${e[t]} of ${r}`);s=e[t]}return r[s]}function G(t,e,n,r,s){switch((t=t.split("%"))[1]){case"array":if(!z(e))return error(`expected index to be a number , got ${e}`);break;case"object":if(z(e))return error(`expected key to be string , got ${e}`);break;case"string":return error(`cannot change ${e} of read only strings`)}let o=scopes[t[1]];r=[e,...r].map((t=>P(t,s))),e=t[2];for(let t=0;t<r.length;t++){if("string"==typeof o[e]&&o[e].startsWith("%"))return G(o[e],r[t],n,r.slice(t+1),s);if(o=o[e],void 0===o)return error(`cannot set proprety ${r[t]} of ${o}`);e=r[t]}o[e]=n}function Q(t,e,n){n.hasOwnProperty(t)?n[t]=e:scopes.vars[t]=e}function tt(t,e,n,r){if(void 0!==t)return P(t,n);error(`invalid command - ${e} with arg ${r}`)}function et(t){let e=0,n=!1,r=0;for(const s of t){if("'"==s){if(n){const n=H();let s=t.slice(0,e);return s+=`%string%${n}`,s+=t.slice(r+1,t.length),scopes.string[n]=D(t.slice(e+1,r)),et(s)}e=r,n=!n}r++}return t}function nt(t){return"\t"==config.tab?function(t){let e=0;for(;t.startsWith("\t");)e++,t=t.substring(1);return e}(t):function(t){let e=0;for(;t.startsWith(" ");)e++,t=t.substring(1);return Math.floor(e/config.tab)}(t)}const rt=[];const st=function(e,n=t){let r;const s=new Set;function o(t){if(i(e,t)&&(e=t,r)){const t=!rt.length;for(const t of s)t[1](),rt.push(t,e);if(t){for(let t=0;t<rt.length;t+=2)rt[t][0](rt[t+1]);rt.length=0}}}return{set:o,update:function(t){o(t(e))},subscribe:function(i,c=t){const l=[i,c];return s.add(l),1===s.size&&(r=n(o)||t),i(e),()=>{s.delete(l),0===s.size&&(r(),r=null)}}}}("");async function ot(t){st.set(""),globalThis.scopes={},globalThis.hash_code=0,scopes.global=[],scopes.vars={},scopes.object={},scopes.array={},scopes.string={};try{await async function(t,e){let n,r=["global"],s=0,o=!1,i=[],c=!1;for(let l of t){const t=nt(l);if(l.includes("#")&&(l.includes("##")&&(o=!o),l=l.split("#")[0]),l=et(l),l=l.replace("[","<").replace("]",">"),l=l.trim(),o);else if(l){if(l.startsWith("import "))await e(l.slice(6));else if(s==t)scopes[I(r)].push(l);else if(s>t){for(const e of Array(s-t))r.pop();scopes[I(r)].push(l)}else if(s<t)if(n.startsWith("function")){scopes[I(r)].pop();let t=n.split(" ").filter(Boolean);t=t[1],scopes[t]=[n,l],r.push(t)}else if(n.startsWith("if")){const t=H();scopes[I(r)].pop(),scopes[I(r)].push(t);const e=H();scopes[e]=[l],r.push(e),i.push(t),scopes[t]=[n,e]}else if(n.startsWith("else")){i.length||error(`invalid if block\n${n}\n${l}`,!0),scopes[I(r)].pop();const t=H();r.push(t),scopes[t]=[l],scopes[I(i)].push(n,t),n.startsWith("elseif")||i.pop()}else if(n.startsWith("while")||n.startsWith("loop")||n.startsWith("foreach")){const t=H();scopes[I(r)].pop(),scopes[I(r)].push(t),scopes[t]=[n,l],r.push(t)}else if(n.startsWith("try")){c=H();const t=H();scopes[I(r)].pop(),scopes[I(r)].push(c),scopes[t]=[l],scopes[c]=[n,t],r.push(t)}else if(n.startsWith("catch")){c||error(`try block not found \n ${n}\n${l}`,!0);const t=H();scopes[c].push(n,t),scopes[I(r)].pop(),scopes[t]=[l],r.pop(),r.push(t),c=null}else if(n.startsWith("switch")){const t=H();scopes[I(r)].pop(),scopes[I(r)].push(t),scopes[t]=[n,l],r.push(t)}else if(n.startsWith("default")||n.startsWith("case")){const t=H();scopes[t]=[l],scopes[I(r)].push(t),r.push(t)}else error(`invalid scope change\n${n}\n${l}`,!0);s=t,n=l}}}(t,it),console.log(scopes),function(){const{breaked:t}=U(scopes.global,scopes.vars);t&&error("invalid break statment in global scope")}(scopes.global,scopes.vars),console.log(scopes)}catch(t){log(t),log("FATAL ERROR - terminating program...")}}function it(t){error(`cannot import file ${t} from online editor`)}globalThis.config={tab:"\t",max_loop_limit:1e3},globalThis.error=(t,e)=>{if(globalThis.enable_catch)return globalThis.currentError=t,!undefined_var;if(!e)throw`[RUNTIME ERROR] ${t}`;throw`[SYNTAX ERROR] ${t}`},globalThis.log=t=>{st.update((e=>e+`${t}\n`))};const ct=window;function lt(t,e,n={}){const r=Object.assign({tab:"\t",indentOn:/{$/,spellcheck:!1,catchTab:!0,preserveIdent:!0,addClosing:!0,history:!0,window:ct},n),s=r.window,o=s.document;let i,c,l=[],a=[],u=-1,f=!1;t.setAttribute("contenteditable","plaintext-only"),t.setAttribute("spellcheck",r.spellcheck?"true":"false"),t.style.outline="none",t.style.overflowWrap="break-word",t.style.overflowY="auto",t.style.whiteSpace="pre-wrap";let p=!1;e(t),"plaintext-only"!==t.contentEditable&&(p=!0),p&&t.setAttribute("contenteditable","true");const d=O((()=>{const n=y();e(t,n),$(n)}),30);let h=!1;const g=t=>!W(t)&&!T(t)&&"Meta"!==t.key&&"Control"!==t.key&&"Alt"!==t.key&&!t.key.startsWith("Arrow"),b=O((t=>{g(t)&&(x(),h=!1)}),300),m=(e,n)=>{l.push([e,n]),t.addEventListener(e,n)};function y(){const e=S(),n={start:0,end:0,dir:void 0};let{anchorNode:r,anchorOffset:s,focusNode:i,focusOffset:c}=e;if(!r||!i)throw"error1";if(r.nodeType===Node.ELEMENT_NODE){const t=o.createTextNode("");r.insertBefore(t,r.childNodes[s]),r=t,s=0}if(i.nodeType===Node.ELEMENT_NODE){const t=o.createTextNode("");i.insertBefore(t,i.childNodes[c]),i=t,c=0}return _(t,(t=>{if(t===r&&t===i)return n.start+=s,n.end+=c,n.dir=s<=c?"->":"<-","stop";if(t===r){if(n.start+=s,n.dir)return"stop";n.dir="->"}else if(t===i){if(n.end+=c,n.dir)return"stop";n.dir="<-"}t.nodeType===Node.TEXT_NODE&&("->"!=n.dir&&(n.start+=t.nodeValue.length),"<-"!=n.dir&&(n.end+=t.nodeValue.length))})),t.normalize(),n}function $(e){const n=S();let r,s,o=0,i=0;if(e.dir||(e.dir="->"),e.start<0&&(e.start=0),e.end<0&&(e.end=0),"<-"==e.dir){const{start:t,end:n}=e;e.start=n,e.end=t}let c=0;_(t,(t=>{if(t.nodeType!==Node.TEXT_NODE)return;const n=(t.nodeValue||"").length;if(c+n>e.start&&(r||(r=t,o=e.start-c),c+n>e.end))return s=t,i=e.end-c,"stop";c+=n})),r||(r=t,o=t.childNodes.length),s||(s=t,i=t.childNodes.length),"<-"==e.dir&&([r,o,s,i]=[s,i,r,o]),n.setBaseAndExtent(r,o,s,i)}function v(){const e=S().getRangeAt(0),n=o.createRange();return n.selectNodeContents(t),n.setEnd(e.startContainer,e.startOffset),n.toString()}function k(){const e=S().getRangeAt(0),n=o.createRange();return n.selectNodeContents(t),n.setStart(e.endContainer,e.endOffset),n.toString()}function w(t){if(p&&"Enter"===t.key)if(M(t),t.stopPropagation(),""==k()){E("\n ");const t=y();t.start=--t.end,$(t)}else E("\n")}function x(){if(!f)return;const e=t.innerHTML,n=y(),r=a[u];if(r&&r.html===e&&r.pos.start===n.start&&r.pos.end===n.end)return;u++,a[u]={html:e,pos:n},a.splice(u+1);u>300&&(u=300,a.splice(0,1))}function _(t,e){const n=[];t.firstChild&&n.push(t.firstChild);let r=n.pop();for(;r&&"stop"!==e(r);)r.nextSibling&&n.push(r.nextSibling),r.firstChild&&n.push(r.firstChild),r=n.pop()}function N(t){return t.metaKey||t.ctrlKey}function W(t){return N(t)&&!t.shiftKey&&"KeyZ"===t.code}function T(t){return N(t)&&t.shiftKey&&"KeyZ"===t.code}function E(t){t=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),o.execCommand("insertHTML",!1,t)}function O(t,e){let n=0;return(...r)=>{clearTimeout(n),n=s.setTimeout((()=>t(...r)),e)}}function C(t){let e=t.length-1;for(;e>=0&&"\n"!==t[e];)e--;e++;let n=e;for(;n<t.length&&/[ \t]/.test(t[n]);)n++;return[t.substring(e,n)||"",e,n]}function A(){return t.textContent||""}function M(t){t.preventDefault()}function S(){var e;return(null===(e=t.parentNode)||void 0===e?void 0:e.nodeType)==Node.DOCUMENT_FRAGMENT_NODE?t.parentNode.getSelection():s.getSelection()}return m("keydown",(e=>{e.defaultPrevented||(c=A(),r.preserveIdent?function(t){if("Enter"===t.key){const e=v(),n=k();let[s]=C(e),o=s;if(r.indentOn.test(e)&&(o+=r.tab),o.length>0?(M(t),t.stopPropagation(),E("\n"+o)):w(t),o!==s&&"}"===n[0]){const t=y();E("\n"+s),$(t)}}}(e):w(e),r.catchTab&&function(t){if("Tab"===t.key)if(M(t),t.shiftKey){const t=v();let[e,n]=C(t);if(e.length>0){const t=y(),s=Math.min(r.tab.length,e.length);$({start:n,end:n+s}),o.execCommand("delete"),t.start-=s,t.end-=s,$(t)}}else E(r.tab)}(e),r.addClosing&&function(t){const e="([{'\"",n=")]}'\"",r=k(),s=v(),o="\\"===s.substr(s.length-1),i=r.substr(0,1);if(n.includes(t.key)&&!o&&i===t.key){const e=y();M(t),e.start=++e.end,$(e)}else if(e.includes(t.key)&&!o&&("\"'".includes(t.key)||[""," ","\n"].includes(i))){M(t);const r=y(),s=r.start==r.end?"":S().toString();E(t.key+s+n[e.indexOf(t.key)]),r.start++,r.end++,$(r)}}(e),r.history&&(!function(e){if(W(e)){M(e),u--;const n=a[u];n&&(t.innerHTML=n.html,$(n.pos)),u<0&&(u=0)}if(T(e)){M(e),u++;const n=a[u];n&&(t.innerHTML=n.html,$(n.pos)),u>=a.length&&u--}}(e),g(e)&&!h&&(x(),h=!0)),p&&$(y()))})),m("keyup",(t=>{t.defaultPrevented||t.isComposing||(c!==A()&&d(),b(t),i&&i(A()))})),m("focus",(t=>{f=!0})),m("blur",(t=>{f=!1})),m("paste",(n=>{x(),function(n){M(n);const r=(n.originalEvent||n).clipboardData.getData("text/plain").replace(/\r/g,""),s=y();E(r),e(t),$({start:s.start+r.length,end:s.start+r.length})}(n),x(),i&&i(A())})),{updateOptions(t){Object.assign(r,t)},updateCode(n){t.textContent=n,e(t)},onUpdate(t){i=t},toString:A,save:y,restore:$,recordHistory:x,destroy(){for(let[e,n]of l)t.removeEventListener(e,n)}}}function at(e){let n,r,i,c,p;return{c(){n=f("main"),r=f("div"),h(r,"data-gramm","false"),h(r,"spellcheck","false"),h(r,"class","svelte-1vbfj1z"),h(n,"class","svelte-1vbfj1z")},m(s,u){var f;a(s,n,u),l(n,r),c||(p=[(f=i=dt.call(null,r,{code:pt,$$restProps:e[0]}),f&&o(f.destroy)?f.destroy:t),d(r,"keydown",ht)],c=!0)},p(t,[e]){i&&o(i.update)&&1&e&&i.update.call(null,{code:pt,$$restProps:t[0]})},i:t,o:t,d(t){t&&u(n),c=!1,s(p)}}}let ut=function(){const t=JSON.parse(localStorage.getItem("pipescript-code"));return console.log(t),t||""}(),ft=!1,pt=ut;function dt(t,{code:e,autofocus:n=!0,loc:r=!0,...s}){const o=lt(t,(()=>{}),s);function i({code:t,autofocus:e=!1,loc:n=!0,...r}){o.updateOptions(r),o.updateCode(t)}return o.onUpdate((t=>ut=t)),i({code:e}),n&&t.focus(),{update:i,destroy(){o.destroy()}}}function ht({ctrlKey:t,keyCode:e}){if(ft||(ft=!0,setTimeout(gt,2e3)),13===e)console.log(ut.split("\n")),t&&ot(ut.split("\n"))}function gt(){ft=!1,console.log("saved"),localStorage.setItem("pipescript-code",JSON.stringify(ut))}function bt(t,n,r){const s=[];let o=c(n,s);return t.$$set=t=>{n=e(e({},n),function(t){const e={};for(const n in t)"$"!==n[0]&&(e[n]=t[n]);return e}(t)),r(0,o=c(n,s))},[o]}class mt extends B{constructor(t){super(),L(this,t,bt,at,i,{})}}function yt(e){let n,r,s,o;return{c(){n=f("main"),r=f("textarea"),h(r,"placeholder","Console"),r.readOnly=!0,h(r,"class","svelte-q6c650"),h(n,"class","svelte-q6c650")},m(t,i){a(t,n,i),l(n,r),g(r,e[0]),s||(o=d(r,"input",e[1]),s=!0)},p(t,[e]){1&e&&g(r,t[0])},i:t,o:t,d(t){t&&u(n),s=!1,o()}}}function $t(t,e,n){let r="";return st.subscribe((t=>{n(0,r=t)})),[r,function(){r=this.value,n(0,r)}]}class vt extends B{constructor(t){super(),L(this,t,$t,yt,i,{})}}function kt(e){let n,r,s,o,i,c;return s=new mt({}),i=new vt({}),{c(){n=f("main"),r=f("section"),M(s.$$.fragment),o=p(),M(i.$$.fragment),h(r,"class","svelte-15ojgx8"),h(n,"class","svelte-15ojgx8")},m(t,e){a(t,n,e),l(n,r),S(s,r,null),l(r,o),S(i,r,null),c=!0},p:t,i(t){c||(C(s.$$.fragment,t),C(i.$$.fragment,t),c=!0)},o(t){A(s.$$.fragment,t),A(i.$$.fragment,t),c=!1},d(t){t&&u(n),j(s),j(i)}}}return new class extends B{constructor(t){super(),L(this,t,null,kt,i,{})}}({target:document.body})}();
//# sourceMappingURL=bundle.js.map
