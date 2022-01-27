<h1 id="introduction">Introduction</h1>
<p>Pipescript is functional, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.</p>
<p>Pipescript can be interpreted directly or be compiled into javascript.</p>
<h3 id="believes">Believes</h3>
<ol>
<li>commands for everything</li>
<li>human readble code</li>
<li>using piping for everything posible</li>
<li>using less symbols</li>
</ol>
<h2 id="variables">Variables</h2>
<p>Variables are declared using set command. use $ to use Variables. use -$ sign to get negative</p>
<pre><code class="language-ruby"># setting variable
set var 10

# using variables
log $var
log -$var
</code></pre>
<h2 id="comments">Comments</h2>
<p>use # to write comments and ## to write multi-line comments</p>
<pre><code class="language-ruby"># this is comment

##
this is a comment
this also is a comment
##
</code></pre>
<h2 id="piping">Piping</h2>
<p>use | to use output of one command as input of another</p>
<pre><code class="language-ruby">log | add 1 1

# how it is processed

log | add 1 1
log 2

set n | add 1 | multiply 1 2
set n | add 1 2
set n 3
</code></pre>
<h2 id="code-block">Code Block</h2>
<p>[ ] are used encapsulate code</p>
<pre><code class="language-ruby">log [add 1 1]

# how it is processed
log [add 1 1]
log 2

log [add 1 1] [add 1 1]
log 2 2
</code></pre>
<h2 id="function">Function</h2>
<p>functions as usual</p>
<pre><code class="language-ruby">function &lt;name&gt; $arg1 $arg2
  return $arg1

function example $n
  return | add $n 10
</code></pre>

<h1 id="data-types">Data Types</h1>
<h1 id="primitive">Primitive</h1>
<h3 id="number">Number</h3>
<p>Number include integer and floats</p>
<h3 id="word">Word</h3>
<p>basically string without spaces and quotes</p>
<pre><code class="language-ruby">log word
</code></pre>
<p>NOTE
word type is not supported by the compiler. using word is not recommended</p>
<h3 id="boolean">Boolean</h3>
<p>boolean as usual</p>
<h3 id="null">Null</h3>
<p>null as usual
fun fact, function return null when return statement is not mentioned</p>
<h3 id="undefined">Undefined</h3>
<p>undefined as usual;</p>
<h1 id="refrence">Refrence</h1>
<p>refrence types have pointers that point to a js object, array, string. to see the pointer</p>
<pre><code class="language-ruby">log | new Array
# output -&gt; %array%@1 : []
</code></pre>
<p><code>%array%@1</code> is example for a pointer</p>
<h2 id="array">Array</h2>
<p>use the new command to create a array</p>
<pre><code class="language-ruby">set arr | new Array

# example
log | new Array 1 2 &#39;element&#39;
output -&gt; [1,2,&#39;element&#39;]
</code></pre>
<h3 id="array-commands">Array Commands</h3>
<p>array commands take array as first argument</p>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
<tbody><tr>
<td>pop</td>
<td>pop last element</td>
<td>1</td>
<td>.pop()</td>
</tr>
<tr>
<td>shift</td>
<td>pop first element</td>
<td>1</td>
<td>.shift()</td>
</tr>
<tr>
<td>indexof</td>
<td>get index of element</td>
<td>2</td>
<td>.indexOf()</td>
</tr>
<tr>
<td>length</td>
<td>length of array</td>
<td>1</td>
<td>.length</td>
</tr>
<tr>
<td>reverse</td>
<td>reverse the array</td>
<td>1</td>
<td>.reverse()</td>
</tr>
<tr>
<td>last</td>
<td>last element of array</td>
<td>1</td>
<td>arr[arr.length-1]</td>
</tr>
<tr>
<td>push</td>
<td>push $1 to end of array</td>
<td>2</td>
<td>.push()</td>
</tr>
<tr>
<td>unshift</td>
<td>push $1 to start of array</td>
<td>2</td>
<td>.unshift()</td>
</tr>
<tr>
<td>includes</td>
<td>check if includes $1</td>
<td>2</td>
<td>.includes()</td>
</tr>
</tbody></table>
<h2 id="object">Object</h2>
<p>use the new command to create a array</p>
<pre><code class="language-ruby">set obj | new Object
</code></pre>
<h3 id="object-commands">Object Commands</h3>
<p>object command takes target object as argument</p>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
</table>
<h2 id="string">String</h2>
<p>single quotes <code>&#39; &#39;</code> are used to declare string</p>
<pre><code class="language-ruby">log &#39;this is a string&#39;
</code></pre>
<h3 id="string-commands">String Commands</h3>
<p>string command takes target string as first argument</p>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
<tbody><tr>
<td>includes</td>
<td>check for search string</td>
<td>2</td>
<td>.includes()</td>
</tr>
<tr>
<td>indexof</td>
<td>get index of string</td>
<td>2</td>
<td>.indexOf()</td>
</tr>
</tbody></table>

<h1 id="commands">Commands</h1>
<p>mostly every thing in pipescript is done using commands. command takes arguments and return a output.</p>
<h2 id="set">set</h2>
<p>used for setting variables</p>
<pre><code class="language-ruby">set &lt;name&gt; &lt;value&gt;

set n 100
</code></pre>
<p><strong>return value</strong> : null
<strong>arguments</strong> : var-name, value</p>
<h2 id="get">get</h2>
<p>get index or key of refrence types</p>
<pre><code class="language-ruby">get &lt;refrence-type&gt; &lt;keys/indexs&gt;
</code></pre>
<p>example</p>
<pre><code class="language-ruby"># pipescript form
1. get $array 0
2. get $array 0 10 &#39;key&#39;

# javascript form
1. array[0]
2. array[0][10][&#39;key&#39;]
</code></pre>
<p><strong>return value</strong> : target value
<strong>arguments</strong> : refrence-type, multiple key/index</p>
<h2 id="log">log</h2>
<p>log multiple inputs to console</p>
<pre><code class="language-ruby">log &lt;input&gt; ...

log &#39;this string will get logged&#39;
log 100 100 # 100100
</code></pre>
<p><strong>return value</strong> : null
<strong>arguments</strong> : input, input ...</p>
<h2 id="call">call</h2>
<p>calling a function</p>
<pre><code class="language-ruby">call &lt;function_name&gt; &lt;arg&gt;

call process 10 10

function process $a $b
  return | add $a $b
</code></pre>
<p><strong>return value</strong> : the return value from called function
<strong>arguments</strong> : function-name, args for function</p>
<h2 id="exit">exit</h2>
<p>exit interpreting script</p>
<pre><code class="language-ruby">exit
</code></pre>
<p><strong>return value</strong> : null
<strong>arguments</strong> : none</p>
<h2 id="arithmetic">Arithmetic</h2>
<p>Arithmetic commands</p>
<h3 id="operators">Operators</h3>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
<tbody><tr>
<td>add</td>
<td>adds multiple inputs</td>
<td>multiple</td>
<td>+</td>
</tr>
<tr>
<td>divide</td>
<td>divde multiple inputs</td>
<td>multiple</td>
<td>/</td>
</tr>
<tr>
<td>multiply</td>
<td>multiply multiple inputs</td>
<td>multiple</td>
<td>*</td>
</tr>
<tr>
<td>neg</td>
<td>return $1 multiply by -1</td>
<td>1</td>
<td>-1 * input</td>
</tr>
<tr>
<td>reminder</td>
<td>reminder of first / secound</td>
<td>2</td>
<td>%</td>
</tr>
</tbody></table>
<h3 id="functions">Functions</h3>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
<tbody><tr>
<td>floor</td>
<td>floor the number</td>
<td>1</td>
<td>Math.floor()</td>
</tr>
<tr>
<td>pow</td>
<td>power of $1 raised to $2</td>
<td>2</td>
<td>Math.pow()</td>
</tr>
<tr>
<td>random</td>
<td>random number between 0 &amp; 1</td>
<td>0</td>
<td>Math.random()</td>
</tr>
<tr>
<td>round</td>
<td>round the number</td>
<td>1</td>
<td>Math.round()</td>
</tr>
</tbody></table>
<h2 id="logic-operators">Logic Operators</h2>
<table>
<thead>
<tr>
<th>command</th>
<th>definition</th>
<th>args no</th>
<th>js equivalent</th>
</tr>
</thead>
<tbody><tr>
<td>boolean</td>
<td>change to boolean</td>
<td>1</td>
<td>Boolean()</td>
</tr>
<tr>
<td>eq</td>
<td>equal to</td>
<td>2</td>
<td>==</td>
</tr>
<tr>
<td>ge</td>
<td>greater than or equal</td>
<td>2</td>
<td>&gt;=</td>
</tr>
<tr>
<td>gt</td>
<td>greater than</td>
<td>2</td>
<td>&gt;</td>
</tr>
<tr>
<td>le</td>
<td>less than or equal</td>
<td>2</td>
<td>&lt;=</td>
</tr>
<tr>
<td>lt</td>
<td>less than</td>
<td>2</td>
<td>&lt;</td>
</tr>
<tr>
<td>not</td>
<td>not operator</td>
<td>1</td>
<td>!</td>
</tr>
<tr>
<td>ternary</td>
<td>ternary operator</td>
<td>3</td>
<td>$1 ? $2 : $3</td>
</tr>
</tbody></table>

<h1 id="conditional-flow">Conditional Flow</h1>
<p>&quot;do this&quot; or &quot;do that&quot; based on some condition.</p>
<h2 id="if-statements">If Statements</h2>
<p>if statements as usual</p>
<pre><code class="language-ruby">if &lt;boolean&gt;
  # do something
elseif &lt;boolean&gt;
  # do something
else
  # do something
</code></pre>
<p>learn more about <a href="#logic-operators">Logical Operators</a></p>
<p>example</p>
<pre><code class="language-ruby">if | eq $n 0
  log &#39;equal to 0&#39;
elseif | lt $n 0
  log &#39;less than 0&#39;
else
  log &#39;something else&#39;
</code></pre>
<h2 id="switch-case">Switch Case</h2>
<p>switch case as usual.</p>
<p>NOTE
pipescript interpreter support multiple default blocks at diffrent levels but the compiler doesnot. the compiler collects all default blocks and puts all of them in single default block at the end of switch block</p>
<pre><code class="language-ruby">switch &lt;input&gt;
  case &lt;value&gt;
    # do something
    # break to stop here
  case &lt;value&gt;
    # do something
    # break to stop here
  default
    # do something
</code></pre>
<p>learn more about <a href="#arithmetic">Arithmetic commands</a></p>
<p>example</p>
<pre><code class="language-ruby">set n 10

switch $n
  case 10
    log 10
    break
  case | add 1 1
    log 1
  default
    log &#39;default&#39;
</code></pre>

<h1 id="iteration">Iteration</h1>
<p>learn more about <a href="#logic-operators">Logical Operators</a></p>
<h2 id="while-loop">While Loop</h2>
<p>while loop as usual</p>
<pre><code class="language-ruby">while &lt;condition&gt;
  # do something
  # break to stop
</code></pre>
<p>example</p>
<pre><code class="language-ruby">set n 0

while | ge 10 $n
  set n | add $n 1
  log $n
</code></pre>
<h2 id="basic-loop">Basic Loop</h2>
<p>loop for certain times</p>
<pre><code class="language-ruby">loop &lt;number&gt;
  # do something
  # break to stop
</code></pre>
<p>example</p>
<pre><code class="language-ruby">loop 10
  log &#39;still looping&#39;
</code></pre>
<h2 id="foreach-loop">Foreach Loop</h2>
<p>loop through items in something iterable ( arrays, objects, string)</p>
<pre><code class="language-ruby">foreach &lt;var&gt; &lt;something iterable&gt;
  # do something
  # break to stop
</code></pre>
<p>example</p>
<pre><code class="language-ruby">set array | new Array

foreach $value $array
  log $value
</code></pre>
