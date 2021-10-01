
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.5' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function value(target, variables) {
      switch (typeof target) {
        case "string":
          const value = checkType(checkForVars(target, variables));
          if (target.startsWith("-$")) return value * -1;
          return value;
        case "undefined":
          return error(`detected undefined value`);
        case "NaN":
          return error(`detected NaN value`);
        default:
          return target;
      }
    }
    function checkType(value) {
      // check for type
      if (value == 0) return 0;
      if (Number(value)) return Number(value);

      if (value == "true") return true;
      if (value == "false") return false;
      if (value == "null") return null;

      return value;
    }

    function checkForVars(value, variables) {
      if (value.startsWith("-$")) value = value.substring(1);
      if (value.startsWith("$")) {
        if (variables.hasOwnProperty(value.substring(1)))
          return variables[value.substring(1)];
        return scopes.vars[value.substring(1)];
      }

      return value;
    }

    function hash() {
      hash_code++;
      return `@${hash_code}`;
    }

    function last(arr) {
      return arr[arr.length - 1];
    }

    function runGlobalScope() {
      const {breaked} = runScope(scopes.global,scopes.vars);
      if(breaked) error(`invalid break statment in global scope`);
    }

    function runScope(scope, vars = {}) {
      scope = scope.slice();

      // run lines
      for (let line of scope) {
        // check for loops / if
        if (line.startsWith("@")) {
          const return_value = checkForKeyWords(line, vars);
          if (return_value.returned || return_value.breaked) return return_value;
        } else {
          if (line.startsWith("break")) return { breaked: true };
          const output = runLine(line, vars);
          if (line.startsWith("return"))
            return { returned: true, value: value(output, vars) };
        }
      }
      return { value: null };
    }

    function checkForKeyWords(line, vars) {
      const first_line = globalThis.scopes[line][0];

      if (first_line.startsWith("while")) return whileLoop(line, vars);
      else if (first_line.startsWith("loop")) return basicLoop(line, vars);
      else if (first_line.startsWith("if")) return if_statement(line, vars);
      return { value: null };
    }

    function runFunction(target, args) {
      // functions is empty
      if (!globalThis.scopes.hasOwnProperty(target))
        return error(`${target} is not a function`);
      const scope = globalThis.scopes[target].slice();

      let line = scope.shift().split(" ").filter(Boolean);
      line = line.splice(2);

      // aruments for function
      const vars = {};
      for (const keyword of line) vars[keyword.substring(1)] = args.shift();
      const return_value = runScope(scope, vars);

      if(return_value.breaked) error(`invalid break statment in function ${target}`);
      return return_value
    }

    function if_statement(hash_name, vars) {
      const statment = scopes[hash_name].slice();

      let hash;
      const count = statment.length / 2;
      for (const _ of new Array(count)) {
        let condition = statment.shift();

        condition = condition + " ";

        if (condition.startsWith("if")) {
          condition = "boolean " + condition.slice(2, -1);
          if (runLine(condition, vars)) {
            hash = statment.shift();
            break;
          }
        } else if (condition.startsWith("elseif")) {
          condition = "boolean " + condition.slice(6, -1);
          if (runLine(condition, vars)) {
            hash = statment.shift();
            break;
          }
        } else if (condition.startsWith("else")) {
          hash = statment.shift();
          break;
        }
        statment.shift();
      }

      if (hash) return runScope(scopes[hash], vars);
      else return {};
    }

    function basicLoop(lines, vars) {
      let count = scopes[lines].slice();
      count = count.shift() + " ";
      count = value(count.slice(4, -1).trim(), vars);

      let x = config.max_loop_limit;

      while (count > 0) {
        const { breaked, returned, value } = runScope(
          scopes[lines].slice(1),
          vars
        );
        if (breaked) break;
        if (returned) return { returned, value };

        count--;
        if (!x) return error("stack overflow");
        else x--;
      }
      return {};
    }

    function whileLoop(lines, vars) {
      let command = scopes[lines].slice();
      command = command.shift() + " ";

      command = "boolean" + command.slice(5, -1);

      let x = config.max_loop_limit;
      while (runLine(command, vars)) {
        const { breaked, returned, value } = runScope(
          scopes[lines].slice(1),
          vars
        );
        if (breaked) break;
        if (returned) return { returned, value };

        if (!x) return error("stack overflow");
        else x--;
      }
      return {};
    }

    function runLine(line, vars) {
      line = checkForBlocks(line, vars);
      line = line.split(" | ").reverse();
      // piping
      let output = "";
      for (let statment of line) {
        statment = statment.trim();

        statment += ` ${output}`;
        output = runStatement(statment, vars);
      }
      return output;
    }

    function checkForBlocks(line, vars, open_stack = []) {
      if (!line.includes("[") && !line.includes("]")) return line;

      let pos = 0;

      for (const letter of line) {
        if (letter == "[") open_stack.push(pos);
        else if (letter == "]") {
          const open_pos = open_stack.pop();

          line =
            line.slice(0, open_pos) +
            runLine(line.slice(open_pos + 1, pos), vars) +
            line.slice(pos + 1, line.length);

          if (!line.includes("]")) break;
          else {
            line = checkForBlocks(line, vars, open_stack);
            break;
          }
        }
        pos++;
      }
      return line;
    }

    function runStatement(line, vars) {
      line = line.split(" ").filter(Boolean);
      const command = line.shift();
      return runCommand(vars, command, line);
    }

    function runCommand(vars, command, line) {
      // key words
      switch (command) {
        case "break":
          return "break";
        case "return":
          return line[0];
      }

      // NO ARG
      switch (command) {
        case "exit":
          process.exit();
        case "random":
          return Math.random();
        case "Object":
          hash_num = hash();
          scopes.object[`@${hash_num}`] = {};
          return `%object%@${hash_num}`;
        case "Array":
          hash_num = hash();
          scopes.array[`@${hash_num}`] = [];
          return `%array%@${hash_num}`;
      }

      // MULTIPLE
      switch (command) {
        case "log":
          log(line.reduce((acc, cur) => (acc += value(cur, vars)), ""));
          return null;

        case "add":
          let first_value = 0;
          if (line.some((n) => typeof value(n, vars) != "number"))
            first_value = "";
          return line.reduce((acc, cur) => acc + value(cur, vars), first_value);
        case "multiply":
          return line.reduce((acc, cur) => (acc *= value(cur, vars)), 1);
        case "divide":
          return line.reduce((acc, cur) => (acc /= value(cur, vars)), 1);
      }

      // 1 ARG
      const $1 = checkArg(line.shift(), command, vars);
      switch (command) {
        case "boolean":
          return Boolean($1);
        case "not":
          return !Boolean($1);
        case "call":
          const args = [];
          for (const arg of line) args.push(value(arg, vars));
          return runFunction($1, args).value;
        case "round":
          return Math.round($1);
        case "floor":
          return Math.floor($1);
      }

      // 2 ARG
      const $2 = checkArg(line.shift(), command, vars, [$1]);
      switch (command) {
        case "get":
          let pointer = value($1, vars);
          if (!pointer) error(`${$1} is not defined (Array/Object)`);
          pointer = pointer.split("%");
          return scopes[pointer[1]][pointer[2]][$2];
        case "set":
          if (Number($1) || $1 == 0)
            return error(`expected Chars got Number ${$1}`);
          if ($1.startsWith("%"))
            setValue($1, $2, checkArg(line.shift(), command, vars, [$1, $2]));
          else setVar($1, $2, vars);
          return null;
        case "pow":
          sum = $1;
          return Math.pow($1, $2);
        case "reminder":
          return $1 % $2;

        // logic
        case "eq":
          return $1 == $2;
        case "gt":
          return $1 > $2;
        case "lt":
          return $1 < $2;
        case "ge":
          return $1 >= $2;
        case "le":
          return $1 <= $2;
      }

      error(`invalid command - ${command} with arg ${[$1, $2, ...line]}`);
    }

    function setValue(target, key, value) {
      target = target.split("%").filter(Boolean);
      switch (target[0]) {
        case "array":
          if (!Number(key) && key != 0)
            error(`expected index to be a number , got ${key}`);
      }
      scopes[target[0]][target[1]][key] = value;
    }

    function setVar(target, value, vars) {
      if (vars.hasOwnProperty(target)) vars[target] = value;
      else scopes.vars[target] = value;
    }

    function checkArg(target, command, vars, args = []) {
      if (Number(target) || target == 0) return Number(target);
      else if (typeof target == "undefined") {
        error(`invalid command - ${command} with arg ${[target, ...args]}`);
      } else return value(target, vars);
    }

    async function classifyScopes(file, import_function) {
      let scope_stack = ["global"];
      let last_depth = 0;
      let line_before;
      let last_if_hash = null;
      let last_comment = false;

      for (let line of file) {
        const depth = checkDepth(line);

        // check for comments
        if (line.includes("#")) {
          if (line.includes("##")) last_comment = last_comment ? false :true;
          line = line.split("#")[0];
        }
        
        line = line.trim();
        if (last_comment);
        else if (line) {
          // line not empty
          if (line.startsWith("import ")) await import_function(line.slice(6));
          //no change
          else if (last_depth == depth) scopes[last(scope_stack)].push(line);
          // came out
          else if (last_depth > depth) {
            for (const _ of Array(last_depth - depth)) scope_stack.pop();
            scopes[last(scope_stack)].push(line);
          }
          // diving into
          else if (last_depth < depth) {
            // new function
            if (line_before.startsWith("function")) {
              // remove declaration line
              scopes[last(scope_stack)].pop();

              let function_name = line_before.split(" ").filter(Boolean);
              function_name = function_name[1];

              scopes[function_name] = [line_before, line];
              scope_stack.push(function_name);
            }
            // if statments
            else if (line_before.startsWith("if")) {
              const hash_name = hash();

              // remove line before
              scopes[last(scope_stack)].pop();
              scopes[last(scope_stack)].push(`${hash_name}`);

              const if_hash_name = hash();
              scopes[if_hash_name] = [line];
              scope_stack.push(if_hash_name);

              last_if_hash = hash_name;
              scopes[hash_name] = [line_before, if_hash_name];
            }
            // else / else if
            else if (line_before.startsWith("else")) {
              if (!last_if_hash) error(`invalid if statment - ${line_before}`);
              scopes[last(scope_stack)].pop();

              const hash_name = hash();
              scope_stack.push(hash_name);
              scopes[hash_name] = [line];

              scopes[last_if_hash].push(line_before, hash_name);
              if (!line_before.startsWith("elseif")) last_if_hash = null;
            }

            // while / loops
            else if (
              line_before.startsWith("while") ||
              line_before.startsWith("loop")
            ) {
              const hash_name = hash();

              scopes[last(scope_stack)].pop();
              scopes[last(scope_stack)].push(`${hash_name}`);

              scopes[hash_name] = [line_before, line];
              scope_stack.push(hash_name);
            } else {
              error(`invalid scope change\n${line_before}\n  ${line}`);
            }
          }
          last_depth = depth;
          line_before = line;
        }
      }
    }

    function checkDepth(line) {
      let count = 0;

      while (line.startsWith(" ")) {
        count++;
        line = line.substring(1);
      }

      return Math.floor(count / config.tab);
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const logs = writable('');

    globalThis.config = {
      tab: 2,
      max_loop_limit: 1000,
    };

    globalThis.error = (msg) => {
      logs.update(log => log + `[ERROR] ${msg}\n`);
    };

    globalThis.log = (string) => {
      logs.update((log) => log + `${string}\n`);
    };

    async function execute(file) {
      logs.set("");

      globalThis.scopes = {};
      globalThis.hash_code = 0;
      scopes.global = [];

      scopes.vars = {};
      scopes.object = {};
      scopes.array = {};

      await classifyScopes(file, import_function);
      runGlobalScope(scopes.global, scopes.vars);
      console.log(scopes);
    }

    function import_function(path) {
      error(`cannot import file ${path} from online editor`);
    }

    /* src/Editor.svelte generated by Svelte v3.42.5 */
    const file$2 = "src/Editor.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let textarea_1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			textarea_1 = element("textarea");
    			attr_dev(textarea_1, "id", "editor");
    			attr_dev(textarea_1, "placeholder", "Editor");
    			attr_dev(textarea_1, "spellcheck", "true");
    			attr_dev(textarea_1, "contenteditable", "");
    			attr_dev(textarea_1, "class", "svelte-1nj754i");
    			add_location(textarea_1, file$2, 52, 2, 1127);
    			attr_dev(main, "class", "svelte-1nj754i");
    			add_location(main, file$2, 51, 0, 1118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, textarea_1);
    			set_input_value(textarea_1, /*text*/ ctx[1]);
    			/*textarea_1_binding*/ ctx[4](textarea_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea_1, "input", /*textarea_1_input_handler*/ ctx[3]),
    					listen_dev(textarea_1, "keypress", /*handleKeyPress*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) {
    				set_input_value(textarea_1, /*text*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*textarea_1_binding*/ ctx[4](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function retrive() {
    	const saved_text = JSON.parse(localStorage.getItem("text"));
    	return saved_text ? saved_text : "";
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Editor', slots, []);
    	let textarea;
    	let text = retrive();
    	let running = false;

    	window.addEventListener("keydown", event => {
    		switch (event.code) {
    			case "Tab":
    				event.preventDefault();
    				const start = textarea.selectionStart;
    				const end = textarea.selectionEnd;
    				// set textarea alue to: text before caret + tab + text after caret
    				$$invalidate(1, text = text.substring(0, start) + "  " + text.substring(end));
    				// put caret at right position again
    				textarea.focus();
    				$$invalidate(0, textarea.selectionEnd = start + 2, textarea);
    				break;
    		}
    	});

    	function handleKeyPress(event) {
    		if (!running) {
    			running = true;
    			setTimeout(save, 1000);
    		}

    		switch (event.code) {
    			case "Enter":
    				if (event.ctrlKey) execute(text.split("\n"));
    		}
    	}

    	function save() {
    		running = false;
    		localStorage.setItem("text", JSON.stringify(text));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function textarea_1_input_handler() {
    		text = this.value;
    		$$invalidate(1, text);
    	}

    	function textarea_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			textarea = $$value;
    			$$invalidate(0, textarea);
    		});
    	}

    	$$self.$capture_state = () => ({
    		execute,
    		textarea,
    		text,
    		running,
    		handleKeyPress,
    		save,
    		retrive
    	});

    	$$self.$inject_state = $$props => {
    		if ('textarea' in $$props) $$invalidate(0, textarea = $$props.textarea);
    		if ('text' in $$props) $$invalidate(1, text = $$props.text);
    		if ('running' in $$props) running = $$props.running;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [textarea, text, handleKeyPress, textarea_1_input_handler, textarea_1_binding];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Console.svelte generated by Svelte v3.42.5 */
    const file$1 = "src/Console.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			textarea = element("textarea");
    			attr_dev(textarea, "placeholder", "Console");
    			textarea.readOnly = true;
    			attr_dev(textarea, "class", "svelte-la6hp2");
    			add_location(textarea, file$1, 10, 2, 127);
    			attr_dev(main, "class", "svelte-la6hp2");
    			add_location(main, file$1, 9, 0, 118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, textarea);
    			set_input_value(textarea, /*text*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) {
    				set_input_value(textarea, /*text*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Console', slots, []);
    	let text = '';

    	logs.subscribe(log => {
    		$$invalidate(0, text = log);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Console> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		text = this.value;
    		$$invalidate(0, text);
    	}

    	$$self.$capture_state = () => ({ logs, text });

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, textarea_input_handler];
    }

    class Console extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Console",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.5 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let editor;
    	let t;
    	let console;
    	let current;
    	editor = new Editor({ $$inline: true });
    	console = new Console({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(editor.$$.fragment);
    			t = space();
    			create_component(console.$$.fragment);
    			attr_dev(main, "class", "svelte-4x8ejy");
    			add_location(main, file, 5, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(editor, main, null);
    			append_dev(main, t);
    			mount_component(console, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editor.$$.fragment, local);
    			transition_in(console.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editor.$$.fragment, local);
    			transition_out(console.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(editor);
    			destroy_component(console);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Editor, Console });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
