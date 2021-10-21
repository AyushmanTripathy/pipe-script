
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
        let children = target.childNodes;
        // If target is <head>, there may be children without claim_order
        if (target.nodeName === 'HEAD') {
            const myChildren = [];
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.claim_order !== undefined) {
                    myChildren.push(node);
                }
            }
            children = myChildren;
        }
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            // with fast path for when we are on the current longest subsequence
            const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            // Skip nodes of undefined ordering
            while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
                target.actual_end_child = target.actual_end_child.nextSibling;
            }
            if (node !== target.actual_end_child) {
                // We only insert if the ordering of this node should be modified or the parent node is not target
                if (node.claim_order !== undefined || node.parentNode !== target) {
                    target.insertBefore(node, target.actual_end_child);
                }
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target || node.nextSibling !== null) {
            target.appendChild(node);
        }
    }
    function insert_hydration(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append_hydration(target, node);
        }
        else if (node.parentNode !== target || node.nextSibling != anchor) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text$1(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text$1(' ');
    }
    function empty() {
        return text$1('');
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
    function init_claim_info(nodes) {
        if (nodes.claim_info === undefined) {
            nodes.claim_info = { last_index: 0, total_claimed: 0 };
        }
    }
    function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
        // Try to find nodes in an order such that we lengthen the longest increasing subsequence
        init_claim_info(nodes);
        const resultNode = (() => {
            // We first try to find an element after the previous one
            for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    return node;
                }
            }
            // Otherwise, we try to find one before
            // We iterate in reverse so that we don't go too far back
            for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    else if (replacement === undefined) {
                        // Since we spliced before the last_index, we decrease it
                        nodes.claim_info.last_index--;
                    }
                    return node;
                }
            }
            // If we can't find any matching node, we create a new one
            return createNode();
        })();
        resultNode.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
        return resultNode;
    }
    function claim_element_base(nodes, name, attributes, create_element) {
        return claim_node(nodes, (node) => node.nodeName === name, (node) => {
            const remove = [];
            for (let j = 0; j < node.attributes.length; j++) {
                const attribute = node.attributes[j];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            remove.forEach(v => node.removeAttribute(v));
            return undefined;
        }, () => create_element(name));
    }
    function claim_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, element);
    }
    function claim_text(nodes, data) {
        return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
            const dataStr = '' + data;
            if (node.data.startsWith(dataStr)) {
                if (node.data.length !== dataStr.length) {
                    return node.splitText(dataStr.length);
                }
            }
            else {
                node.data = dataStr;
            }
        }, () => text$1(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
        );
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
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
                start_hydrating();
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
            end_hydrating();
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
    function append_hydration_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append_hydration(target, node);
    }
    function insert_hydration_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert_hydration(target, node, anchor);
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

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
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
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.42.5 */

    function create_fragment$7(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(5, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(7, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ['basepath', 'url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$routes,
    		$base
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 128) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 96) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$location,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.42.5 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_hydration_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    function value(target, variables, var_name) {
      switch (typeof target) {
        case "string":
          const value = checkType(checkForVars(target, variables));
          if (target.startsWith("-$")) return value * -1;
          return value;
        case "undefined":
          return error(`${var_name} is undefined`);
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

      if (typeof value != "string") return value;

      // string
      if (value.startsWith("%string")) {
        value = value.split("%");
        value = scopes[value[1]][value[2]];
      }

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

    function stringify(str) {
      return str.split(" ").join("[s]");
    }

    function str(str) {
      if (typeof str != "string") return str;
      str = str.split("[s]").join(" ");
      return str;
    }

    function pointer(pointer) {
      pointer = pointer.split("%");
      return scopes[pointer[1]][pointer[2]];
    }

    function isPointer(input) {
      return typeof input == "string" && input.startsWith("%");
    }

    function isNumber(num) {
      return Number(num) || num == 0;
    }

    function hash() {
      hash_code++;
      return `@${hash_code}`;
    }

    function last(arr) {
      return arr[arr.length - 1];
    }

    function runGlobalScope() {
      const { breaked } = runScope(scopes.global, scopes.vars);
      if (breaked) error(`invalid break statment in global scope`);
    }

    function runScope(scope, vars = {}) {
      if (!scope) return error(`invalid scope`);
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
      return {};
    }

    function checkForKeyWords(line, vars) {
      const first_line = globalThis.scopes[line][0];

      if (first_line.startsWith("while")) return whileLoop(line, vars);
      else if (first_line.startsWith("loop")) return basicLoop(line, vars);
      else if (first_line.startsWith("if")) return if_statement(line, vars);
      else if (first_line.startsWith("try")) return try_block(line, vars);
      else if (first_line.startsWith("switch")) return switch_block(line, vars);
      else if (first_line.startsWith("foreach")) return foreach_block(line, vars);
      error(`invalid block ${first_line}`);
      return {};
    }

    function runFunction(target, args) {
      config.maximum_call_stack--;
      if (!config.maximum_call_stack) return error("maximum call stack exceded");
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

      if (return_value.breaked)
        error(`invalid break statment in function ${target}`);
      return return_value;
    }

    function foreach_block(hash_code, vars) {
      const scope = scopes[hash_code].slice();
      let statment = scope.shift().split(" ");
      let var_name = statment[1].slice(1);
      statment = runLine("pass_input " + statment.splice(2).join(" "), vars);

      if (isPointer(statment)) statment = pointer(statment);

      if (typeof statment == "object") {
        for (const index in statment) {
          vars[var_name] = statment[index];
          const { breaked, returned, value } = runScope(scope, vars);
          if (breaked) break;
          if (returned) return { returned, value };
        }
      } else error(`${statment} is not iterable`);
      return {};
    }

    function switch_block(hash_code, vars) {
      const statments = scopes[hash_code];
      const input = runLine("pass_input " + statments.shift().slice(6), vars);

      let return_value = {};
      for (let i = 0; i < statments.length; i++) {
        if (statments[i].startsWith("default")) {
          i++;
          return_value = runScope(scopes[statments[i]], vars);
        } else if (statments[i].startsWith("case")) {
          const condition = runLine("pass_input " + statments[i].slice(4), vars);
          i++;
          if (value(input, vars) == value(condition, vars))
            return_value = runScope(scopes[statments[i]], vars);
        } else error(`invalid keyword ${statments[i]} in switch block`);

        if (return_value.breaked) return { value: null };
        if (return_value.returned) return return_value;
      }

      return {};
    }

    function try_block(hash_name, vars) {
      const statment = scopes[hash_name].slice();
      let return_value;

      try {
        return_value = runScope(scopes[statment[1]], vars);
      } catch (e) {
        let error_var = statment[2].split(" ")[1];
        if (error_var) setVar(error_var.substring(1), stringify(e), vars);
        return_value = runScope(scopes[statment[3]], vars);
      }

      return return_value;
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
        else {
          error(`invalid if block \n${condition}`);
        }
        statment.shift();
      }

      if (hash) return runScope(scopes[hash], vars);
      else return {};
    }

    function basicLoop(lines, vars) {
      let count = scopes[lines].slice();
      count = count.shift() + " ";
      count = runLine("number " + count.slice(4, -1).trim(), vars);

      let x = config.max_loop_limit;

      while (count > 0) {
        const { breaked, returned, value } = runScope(
          scopes[lines].slice(1),
          vars
        );
        if (breaked) break;
        if (returned) return { returned, value };

        count--;
        if (!x) return error("Maximum loop limit reached");
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

        if (!x) return error("Maximum loop limit reached");
        else x--;
      }
      return {};
    }

    function runLine(line, vars) {
      line = checkForBlocks(line, vars);
      line = line.split("|").filter(Boolean).reverse();

      // piping
      let output = null;
      for (let statment of line) {
        statment = statment.split(" ").filter(Boolean);
        if (output != null) statment.push(output);
        output = runCommand(vars, statment);
      }
      return output;
    }

    function checkForBlocks(line, vars, open_stack = []) {
      if (!line.includes("<") && !line.includes(">")) return line;

      let pos = 0;

      for (const letter of line) {
        if (letter == "<") open_stack.push(pos);
        else if (letter == ">") {
          const open_pos = open_stack.pop();

          line =
            line.slice(0, open_pos) +
            runLine(line.slice(open_pos + 1, pos), vars) +
            line.slice(pos + 1, line.length);

          if (!line.includes(">")) break;
          else {
            line = checkForBlocks(line, vars, open_stack);
            break;
          }
        }
        pos++;
      }
      return line;
    }

    function runCommand(vars, line) {
      const command = line.shift();
      const line_clone = line.slice();

      // key words
      switch (command) {
        case "break":
          return "break";
        case "return":
          return line[0];
        case "pass_input":
          return value(line[0], vars);
      }

      // NO ARG
      switch (command) {
        case "exit":
          process.exit();
        case "random":
          return Math.random();
      }

      // MULTIPLE
      switch (command) {
        case "log":
          log(line.reduce((acc, cur) => (acc += checkLog(cur, vars)), ""));
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
      const $1 = checkArg(line.shift(), command, vars, line_clone);
      switch (command) {
        case "get":
          return get($1, line, vars);
        case "boolean":
          return Boolean($1);
        case "number":
          return Number($1);
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
        case "new":
          return new_constructor($1);

        // array functions
        case "pop":
          return arr($1, line_clone[0]).pop();
        case "shift":
          return arr($1, line_clone[0]).shift();
        case "length":
          return arr($1, line_clone[0]).length;
        case "reverse":
          return clone($1, [...arr($1, line_clone[0]).reverse()]);
        case "last":
          return last(arr($1, line_clone[0]));
      }
      // 2 ARG
      const $2 = checkArg(line.shift(), command, vars, line_clone);
      switch (command) {
        case "set":
          if (isNumber($1))
            return error(`cannot set value to Number ${line_clone[0]}`);
          else if (isPointer($1)) setValue($1, $2, value(line.pop()), line, vars);
          else setVar($1, $2, vars);
          return null;
        case "pow":
          sum = $1;
          return Math.pow($1, $2);
        case "reminder":
          return $1 % $2;

        // array functions
        case "push":
          arr($1, line_clone[0]).push($2);
          return null;
        case "unshift":
          arr($1, line_clone[0]).unshift($2);
          return null;
        case "includes":
          return arr($1, line_clone[0]).includes($2);

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

      error(`invalid command or arg - ${command} with arg ${[...line_clone]}`);
    }

    function arr(value, var_name) {
      if (isNumber(value)) return error(`${var_name} is not a array`);
      if (!value.startsWith("%array")) return error(`${var_name} is not a array`);
      return pointer(value);
    }

    function checkLog(target, vars) {
      target = value(target, vars);

      if (isPointer(target)) target = pointer(target);
      return str(target);
    }

    function clone(pointer, value) {
      const hash_code = hash();
      pointer = pointer.split("%");
      scopes[pointer[1]][hash_code] = value;
      return `%${pointer[1]}%${hash_code}`;
    }

    function get(target, line, vars) {
      if (isNumber(target) || !target.startsWith("%"))
        return error(`expected refrence type got primitive ${target}`);

      target = target.split("%");
      let val = scopes[target[1]];
      line = line.map((n) => value(n, vars));

      let key = target[2];
      for (let i = 0; i < line.length; i++) {
        if (typeof val[key] == "string" && val[key].startsWith("%"))
          return get(val[key], line.slice(i), vars);

        val = val[key];
        if (typeof val == "undefined")
          return error(`cannot get proprety ${line[i]} of ${val}`);
        key = line[i];
      }

      return val[key];
    }

    function new_constructor(type) {
      const hash_num = hash();
      switch (type) {
        case "Object":
          scopes.object[hash_num] = {};
          return `%object%${hash_num}`;
        case "Array":
          scopes.array[hash_num] = [];
          return `%array%${hash_num}`;
        default:
          return error(`${type} is not a constructor`);
      }
    }

    function setValue(target, key, proprety, line, vars) {
      target = target.split("%");
      switch (target[1]) {
        case "array":
          if (!isNumber(key))
            return error(`expected index to be a number , got ${key}`);
          break;
        case "object":
          if (isNumber(key))
            return error(`expected key to be string , got ${key}`);
          break;
        case "string":
          return error(`cannot change ${key} of read only strings`);
      }
      let val = scopes[target[1]];
      line = [key, ...line].map((n) => value(n, vars));

      key = target[2];
      for (let i = 0; i < line.length; i++) {
        if (typeof val[key] == "string" && val[key].startsWith("%")) {
          return setValue(val[key], line[i], proprety, line.slice(i + 1), vars);
        }

        val = val[key];
        if (typeof val == "undefined")
          return error(`cannot set proprety ${line[i]} of ${val}`);
        key = line[i];
      }
      val[key] = proprety;
    }

    function setVar(target, value, vars) {
      if (vars.hasOwnProperty(target)) vars[target] = value;
      else scopes.vars[target] = value;
    }

    function checkArg(target, command, vars, line) {
      if (typeof target == "undefined") {
        error(`invalid command - ${command} with arg ${line}`);
      } else return value(target, vars);
    }

    async function classifyScopes(file, import_function) {
      let scope_stack = ["global"];
      let last_depth = 0;
      let line_before;
      let last_comment = false;

      let if_hash_code = [];
      let try_hash_code = false;

      for (let line of file) {
        const depth = checkDepth(line);

        // check for comments
        if (line.includes("#")) {
          if (line.includes("##")) last_comment = last_comment ? false : true;
          line = line.split("#")[0];
        }

        line = checkQuotes(line);
        line = line.replace("[", "<").replace("]", ">");

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
              scopes[last(scope_stack)].push(hash_name);

              const if_hash_name = hash();
              scopes[if_hash_name] = [line];
              scope_stack.push(if_hash_name);

              if_hash_code.push(hash_name);
              scopes[hash_name] = [line_before, if_hash_name];
            }
            // else / else if
            else if (line_before.startsWith("else")) {
              if (!if_hash_code.length)
                error(`invalid if block\n${line_before}\n${line}`, true);
              scopes[last(scope_stack)].pop();

              const hash_name = hash();
              scope_stack.push(hash_name);
              scopes[hash_name] = [line];

              scopes[last(if_hash_code)].push(line_before, hash_name);
              if (!line_before.startsWith("elseif")) if_hash_code.pop();
            }

            // while / loops
            else if (
              line_before.startsWith("while") ||
              line_before.startsWith("loop") ||
              line_before.startsWith("foreach")
            ) {
              const hash_name = hash();

              scopes[last(scope_stack)].pop();
              scopes[last(scope_stack)].push(hash_name);

              scopes[hash_name] = [line_before, line];
              scope_stack.push(hash_name);
            }

            // try block
            else if (line_before.startsWith("try")) {
              try_hash_code = hash();
              const hash_code = hash();

              scopes[last(scope_stack)].pop();
              scopes[last(scope_stack)].push(try_hash_code);

              scopes[hash_code] = [line];
              scopes[try_hash_code] = [line_before, hash_code];
              scope_stack.push(hash_code);
            }

            // catch block
            else if (line_before.startsWith("catch")) {
              if (!try_hash_code)
                error(`try block not found \n ${line_before}\n${line}`, true);

              const hash_code = hash();
              scopes[try_hash_code].push(line_before, hash_code);

              scopes[last(scope_stack)].pop();
              scopes[hash_code] = [line];

              scope_stack.pop();
              scope_stack.push(hash_code);
              try_hash_code = null;
            } else if (line_before.startsWith("switch")) {
              const hash_code = hash();
              scopes[last(scope_stack)].pop();
              scopes[last(scope_stack)].push(hash_code);

              scopes[hash_code] = [line_before, line];
              scope_stack.push(hash_code);
            } else if (
              line_before.startsWith("default") ||
              line_before.startsWith("case")
            ) {
              const hash_code = hash();
              scopes[hash_code] = [line];
              scopes[last(scope_stack)].push(hash_code);
              scope_stack.push(hash_code);
            } else {
              error(`invalid scope change\n${line_before}\n${line}`, true);
            }
          }
          last_depth = depth;
          line_before = line;
        }
      }
    }

    function checkQuotes(line) {
      let last_index = 0;
      let pair = false;

      let index = 0;
      for (const letter of line) {
        if (letter == "'") {
          if (pair) {
            const hash_code = hash();

            let temp = line.slice(0, last_index);
            temp += `%string%${hash_code}`;
            temp += line.slice(index + 1, line.length);
            scopes.string[hash_code] = stringify(
              line.slice(last_index + 1, index)
            );
            return checkQuotes(temp);
          } else last_index = index;
          pair = pair ? false : true;
        }
        index++;
      }

      return line;
    }

    function checkDepth(line) {
      return config.tab == "\t" ? checkTab(line) : checkSpace(line);
    }

    function checkSpace(line) {
      let count = 0;
      while (line.startsWith(" ")) {
        count++;
        line = line.substring(1);
      }

      return Math.floor(count / config.tab);
    }

    function checkTab(line) {
      let count = 0;

      while (line.startsWith("\t")) {
        count++;
        line = line.substring(1);
      }
      return count;
    }

    const logs = writable('');

    globalThis.config = {
      tab: '\t',
      max_loop_limit: 1000,
    };

    globalThis.error = (msg, type) => {
      if (globalThis.enable_catch) {
        globalThis.currentError = msg;
        return !undefined_var;
      }
      if (!type) throw `[RUNTIME ERROR] ${msg}`;
      throw `[SYNTAX ERROR] ${msg}`;
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
      scopes.string = {};

      try {
        await classifyScopes(file, import_function);
        console.log(scopes);
        runGlobalScope(scopes.global, scopes.vars);
        console.log(scopes);
      } catch (error) {
        log(error);
        log("FATAL ERROR - terminating program...");
      }
    }

    function import_function(path) {
      error(`cannot import file ${path} from online editor`);
    }

    const globalWindow = window;
    function CodeJar(editor, highlight, opt = {}) {
        const options = Object.assign({ tab: '\t', indentOn: /{$/, spellcheck: false, catchTab: true, preserveIdent: true, addClosing: true, history: true, window: globalWindow }, opt);
        const window = options.window;
        const document = window.document;
        let listeners = [];
        let history = [];
        let at = -1;
        let focus = false;
        let callback;
        let prev; // code content prior keydown event
        editor.setAttribute('contenteditable', 'plaintext-only');
        editor.setAttribute('spellcheck', options.spellcheck ? 'true' : 'false');
        editor.style.outline = 'none';
        editor.style.overflowWrap = 'break-word';
        editor.style.overflowY = 'auto';
        editor.style.whiteSpace = 'pre-wrap';
        let isLegacy = false; // true if plaintext-only is not supported
        highlight(editor);
        if (editor.contentEditable !== 'plaintext-only')
            isLegacy = true;
        if (isLegacy)
            editor.setAttribute('contenteditable', 'true');
        const debounceHighlight = debounce(() => {
            const pos = save();
            highlight(editor, pos);
            restore(pos);
        }, 30);
        let recording = false;
        const shouldRecord = (event) => {
            return !isUndo(event) && !isRedo(event)
                && event.key !== 'Meta'
                && event.key !== 'Control'
                && event.key !== 'Alt'
                && !event.key.startsWith('Arrow');
        };
        const debounceRecordHistory = debounce((event) => {
            if (shouldRecord(event)) {
                recordHistory();
                recording = false;
            }
        }, 300);
        const on = (type, fn) => {
            listeners.push([type, fn]);
            editor.addEventListener(type, fn);
        };
        on('keydown', event => {
            if (event.defaultPrevented)
                return;
            prev = toString();
            if (options.preserveIdent)
                handleNewLine(event);
            else
                legacyNewLineFix(event);
            if (options.catchTab)
                handleTabCharacters(event);
            if (options.addClosing)
                handleSelfClosingCharacters(event);
            if (options.history) {
                handleUndoRedo(event);
                if (shouldRecord(event) && !recording) {
                    recordHistory();
                    recording = true;
                }
            }
            if (isLegacy)
                restore(save());
        });
        on('keyup', event => {
            if (event.defaultPrevented)
                return;
            if (event.isComposing)
                return;
            if (prev !== toString())
                debounceHighlight();
            debounceRecordHistory(event);
            if (callback)
                callback(toString());
        });
        on('focus', _event => {
            focus = true;
        });
        on('blur', _event => {
            focus = false;
        });
        on('paste', event => {
            recordHistory();
            handlePaste(event);
            recordHistory();
            if (callback)
                callback(toString());
        });
        function save() {
            const s = getSelection();
            const pos = { start: 0, end: 0, dir: undefined };
            let { anchorNode, anchorOffset, focusNode, focusOffset } = s;
            if (!anchorNode || !focusNode)
                throw 'error1';
            // Selection anchor and focus are expected to be text nodes,
            // so normalize them.
            if (anchorNode.nodeType === Node.ELEMENT_NODE) {
                const node = document.createTextNode('');
                anchorNode.insertBefore(node, anchorNode.childNodes[anchorOffset]);
                anchorNode = node;
                anchorOffset = 0;
            }
            if (focusNode.nodeType === Node.ELEMENT_NODE) {
                const node = document.createTextNode('');
                focusNode.insertBefore(node, focusNode.childNodes[focusOffset]);
                focusNode = node;
                focusOffset = 0;
            }
            visit(editor, el => {
                if (el === anchorNode && el === focusNode) {
                    pos.start += anchorOffset;
                    pos.end += focusOffset;
                    pos.dir = anchorOffset <= focusOffset ? '->' : '<-';
                    return 'stop';
                }
                if (el === anchorNode) {
                    pos.start += anchorOffset;
                    if (!pos.dir) {
                        pos.dir = '->';
                    }
                    else {
                        return 'stop';
                    }
                }
                else if (el === focusNode) {
                    pos.end += focusOffset;
                    if (!pos.dir) {
                        pos.dir = '<-';
                    }
                    else {
                        return 'stop';
                    }
                }
                if (el.nodeType === Node.TEXT_NODE) {
                    if (pos.dir != '->')
                        pos.start += el.nodeValue.length;
                    if (pos.dir != '<-')
                        pos.end += el.nodeValue.length;
                }
            });
            // collapse empty text nodes
            editor.normalize();
            return pos;
        }
        function restore(pos) {
            const s = getSelection();
            let startNode, startOffset = 0;
            let endNode, endOffset = 0;
            if (!pos.dir)
                pos.dir = '->';
            if (pos.start < 0)
                pos.start = 0;
            if (pos.end < 0)
                pos.end = 0;
            // Flip start and end if the direction reversed
            if (pos.dir == '<-') {
                const { start, end } = pos;
                pos.start = end;
                pos.end = start;
            }
            let current = 0;
            visit(editor, el => {
                if (el.nodeType !== Node.TEXT_NODE)
                    return;
                const len = (el.nodeValue || '').length;
                if (current + len > pos.start) {
                    if (!startNode) {
                        startNode = el;
                        startOffset = pos.start - current;
                    }
                    if (current + len > pos.end) {
                        endNode = el;
                        endOffset = pos.end - current;
                        return 'stop';
                    }
                }
                current += len;
            });
            if (!startNode)
                startNode = editor, startOffset = editor.childNodes.length;
            if (!endNode)
                endNode = editor, endOffset = editor.childNodes.length;
            // Flip back the selection
            if (pos.dir == '<-') {
                [startNode, startOffset, endNode, endOffset] = [endNode, endOffset, startNode, startOffset];
            }
            s.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
        }
        function beforeCursor() {
            const s = getSelection();
            const r0 = s.getRangeAt(0);
            const r = document.createRange();
            r.selectNodeContents(editor);
            r.setEnd(r0.startContainer, r0.startOffset);
            return r.toString();
        }
        function afterCursor() {
            const s = getSelection();
            const r0 = s.getRangeAt(0);
            const r = document.createRange();
            r.selectNodeContents(editor);
            r.setStart(r0.endContainer, r0.endOffset);
            return r.toString();
        }
        function handleNewLine(event) {
            if (event.key === 'Enter') {
                const before = beforeCursor();
                const after = afterCursor();
                let [padding] = findPadding(before);
                let newLinePadding = padding;
                // If last symbol is "{" ident new line
                // Allow user defines indent rule
                if (options.indentOn.test(before)) {
                    newLinePadding += options.tab;
                }
                // Preserve padding
                if (newLinePadding.length > 0) {
                    preventDefault(event);
                    event.stopPropagation();
                    insert('\n' + newLinePadding);
                }
                else {
                    legacyNewLineFix(event);
                }
                // Place adjacent "}" on next line
                if (newLinePadding !== padding && after[0] === '}') {
                    const pos = save();
                    insert('\n' + padding);
                    restore(pos);
                }
            }
        }
        function legacyNewLineFix(event) {
            // Firefox does not support plaintext-only mode
            // and puts <div><br></div> on Enter. Let's help.
            if (isLegacy && event.key === 'Enter') {
                preventDefault(event);
                event.stopPropagation();
                if (afterCursor() == '') {
                    insert('\n ');
                    const pos = save();
                    pos.start = --pos.end;
                    restore(pos);
                }
                else {
                    insert('\n');
                }
            }
        }
        function handleSelfClosingCharacters(event) {
            const open = `([{'"`;
            const close = `)]}'"`;
            const codeAfter = afterCursor();
            const codeBefore = beforeCursor();
            const escapeCharacter = codeBefore.substr(codeBefore.length - 1) === '\\';
            const charAfter = codeAfter.substr(0, 1);
            if (close.includes(event.key) && !escapeCharacter && charAfter === event.key) {
                // We already have closing char next to cursor.
                // Move one char to right.
                const pos = save();
                preventDefault(event);
                pos.start = ++pos.end;
                restore(pos);
            }
            else if (open.includes(event.key)
                && !escapeCharacter
                && (`"'`.includes(event.key) || ['', ' ', '\n'].includes(charAfter))) {
                preventDefault(event);
                const pos = save();
                const wrapText = pos.start == pos.end ? '' : getSelection().toString();
                const text = event.key + wrapText + close[open.indexOf(event.key)];
                insert(text);
                pos.start++;
                pos.end++;
                restore(pos);
            }
        }
        function handleTabCharacters(event) {
            if (event.key === 'Tab') {
                preventDefault(event);
                if (event.shiftKey) {
                    const before = beforeCursor();
                    let [padding, start,] = findPadding(before);
                    if (padding.length > 0) {
                        const pos = save();
                        // Remove full length tab or just remaining padding
                        const len = Math.min(options.tab.length, padding.length);
                        restore({ start, end: start + len });
                        document.execCommand('delete');
                        pos.start -= len;
                        pos.end -= len;
                        restore(pos);
                    }
                }
                else {
                    insert(options.tab);
                }
            }
        }
        function handleUndoRedo(event) {
            if (isUndo(event)) {
                preventDefault(event);
                at--;
                const record = history[at];
                if (record) {
                    editor.innerHTML = record.html;
                    restore(record.pos);
                }
                if (at < 0)
                    at = 0;
            }
            if (isRedo(event)) {
                preventDefault(event);
                at++;
                const record = history[at];
                if (record) {
                    editor.innerHTML = record.html;
                    restore(record.pos);
                }
                if (at >= history.length)
                    at--;
            }
        }
        function recordHistory() {
            if (!focus)
                return;
            const html = editor.innerHTML;
            const pos = save();
            const lastRecord = history[at];
            if (lastRecord) {
                if (lastRecord.html === html
                    && lastRecord.pos.start === pos.start
                    && lastRecord.pos.end === pos.end)
                    return;
            }
            at++;
            history[at] = { html, pos };
            history.splice(at + 1);
            const maxHistory = 300;
            if (at > maxHistory) {
                at = maxHistory;
                history.splice(0, 1);
            }
        }
        function handlePaste(event) {
            preventDefault(event);
            const text = (event.originalEvent || event)
                .clipboardData
                .getData('text/plain')
                .replace(/\r/g, '');
            const pos = save();
            insert(text);
            highlight(editor);
            restore({ start: pos.start + text.length, end: pos.start + text.length });
        }
        function visit(editor, visitor) {
            const queue = [];
            if (editor.firstChild)
                queue.push(editor.firstChild);
            let el = queue.pop();
            while (el) {
                if (visitor(el) === 'stop')
                    break;
                if (el.nextSibling)
                    queue.push(el.nextSibling);
                if (el.firstChild)
                    queue.push(el.firstChild);
                el = queue.pop();
            }
        }
        function isCtrl(event) {
            return event.metaKey || event.ctrlKey;
        }
        function isUndo(event) {
            return isCtrl(event) && !event.shiftKey && event.code === 'KeyZ';
        }
        function isRedo(event) {
            return isCtrl(event) && event.shiftKey && event.code === 'KeyZ';
        }
        function insert(text) {
            text = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
            document.execCommand('insertHTML', false, text);
        }
        function debounce(cb, wait) {
            let timeout = 0;
            return (...args) => {
                clearTimeout(timeout);
                timeout = window.setTimeout(() => cb(...args), wait);
            };
        }
        function findPadding(text) {
            // Find beginning of previous line.
            let i = text.length - 1;
            while (i >= 0 && text[i] !== '\n')
                i--;
            i++;
            // Find padding of the line.
            let j = i;
            while (j < text.length && /[ \t]/.test(text[j]))
                j++;
            return [text.substring(i, j) || '', i, j];
        }
        function toString() {
            return editor.textContent || '';
        }
        function preventDefault(event) {
            event.preventDefault();
        }
        function getSelection() {
            var _a;
            if (((_a = editor.parentNode) === null || _a === void 0 ? void 0 : _a.nodeType) == Node.DOCUMENT_FRAGMENT_NODE) {
                return editor.parentNode.getSelection();
            }
            return window.getSelection();
        }
        return {
            updateOptions(newOptions) {
                Object.assign(options, newOptions);
            },
            updateCode(code) {
                editor.textContent = code;
                highlight(editor);
            },
            onUpdate(cb) {
                callback = cb;
            },
            toString,
            save,
            restore,
            recordHistory,
            destroy() {
                for (let [type, fn] of listeners) {
                    editor.removeEventListener(type, fn);
                }
            },
        };
    }

    /* src/editor/Editor.svelte generated by Svelte v3.42.5 */
    const file$5 = "src/editor/Editor.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let div;
    	let codedit_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);

    			div = claim_element(main_nodes, "DIV", {
    				"data-gramm": true,
    				spellcheck: true,
    				class: true
    			});

    			children(div).forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(div, "data-gramm", "false");
    			attr_dev(div, "spellcheck", "false");
    			attr_dev(div, "class", "svelte-1vbfj1z");
    			add_location(div, file$5, 59, 2, 1208);
    			attr_dev(main, "class", "svelte-1vbfj1z");
    			add_location(main, file$5, 58, 0, 1199);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			append_hydration_dev(main, div);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(codedit_action = codedit.call(null, div, {
    						code,
    						$$restProps: /*$$restProps*/ ctx[0]
    					})),
    					listen_dev(div, "keydown", handleKeyPress, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (codedit_action && is_function(codedit_action.update) && dirty & /*$$restProps*/ 1) codedit_action.update.call(null, {
    				code,
    				$$restProps: /*$$restProps*/ ctx[0]
    			});
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let text = retrive();
    let running = false;
    let code = text;

    function codedit(node, { code, autofocus = true, loc = true, ...options }) {
    	const editor = CodeJar(
    		node,
    		() => {
    			
    		},
    		options
    	);

    	editor.onUpdate(code => text = code);

    	function update({ code, autofocus = false, loc = true, ...options }) {
    		editor.updateOptions(options);
    		editor.updateCode(code);
    	}

    	update({ code });
    	autofocus && node.focus();

    	return {
    		update,
    		destroy() {
    			editor.destroy();
    		}
    	};
    }

    // running
    function handleKeyPress({ ctrlKey, keyCode }) {
    	if (!running) {
    		running = true;
    		setTimeout(save, 2000);
    	}

    	switch (keyCode) {
    		case 13:
    			if (ctrlKey) execute(text.split("\n"));
    	}
    }

    function save() {
    	running = false;
    	localStorage.setItem("pipescript-code", JSON.stringify(text));
    }

    function retrive() {
    	const saved_text = JSON.parse(localStorage.getItem("pipescript-code"));
    	return saved_text ? saved_text : "";
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const omit_props_names = [];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Editor', slots, []);

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(0, $$restProps = compute_rest_props($$props, omit_props_names));
    	};

    	$$self.$capture_state = () => ({
    		CodeJar,
    		execute,
    		text,
    		running,
    		code,
    		codedit,
    		handleKeyPress,
    		save,
    		retrive
    	});

    	return [$$restProps];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/editor/Console.svelte generated by Svelte v3.42.5 */
    const file$4 = "src/editor/Console.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			textarea = element("textarea");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			textarea = claim_element(main_nodes, "TEXTAREA", { placeholder: true, class: true });
    			children(textarea).forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(textarea, "placeholder", "Console");
    			textarea.readOnly = true;
    			attr_dev(textarea, "class", "svelte-q6c650");
    			add_location(textarea, file$4, 10, 2, 128);
    			attr_dev(main, "class", "svelte-q6c650");
    			add_location(main, file$4, 9, 0, 119);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			append_hydration_dev(main, textarea);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Console",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/util/Navbar.svelte generated by Svelte v3.42.5 */
    const file$3 = "src/util/Navbar.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let a0;
    	let t0;
    	let t1;
    	let a1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			a0 = element("a");
    			t0 = text$1("Home");
    			t1 = space();
    			a1 = element("a");
    			t2 = text$1("Editor");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			a0 = claim_element(main_nodes, "A", { href: true, class: true });
    			var a0_nodes = children(a0);
    			t0 = claim_text(a0_nodes, "Home");
    			a0_nodes.forEach(detach_dev);
    			t1 = claim_space(main_nodes);
    			a1 = claim_element(main_nodes, "A", { href: true, class: true });
    			var a1_nodes = children(a1);
    			t2 = claim_text(a1_nodes, "Editor");
    			a1_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-1suob06");
    			add_location(a0, file$3, 5, 2, 70);
    			attr_dev(a1, "href", "/editor");
    			attr_dev(a1, "class", "svelte-1suob06");
    			add_location(a1, file$3, 6, 2, 102);
    			attr_dev(main, "class", "svelte-1suob06");
    			add_location(main, file$3, 4, 0, 61);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			append_hydration_dev(main, a0);
    			append_hydration_dev(a0, t0);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, a1);
    			append_hydration_dev(a1, t2);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1))
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link });
    	return [];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/editor/WebEditor.svelte generated by Svelte v3.42.5 */

    const { console: console_1 } = globals;
    const file$2 = "src/editor/WebEditor.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let section;
    	let editor;
    	let t1;
    	let console;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	editor = new Editor({ $$inline: true });
    	console = new Console({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			section = element("section");
    			create_component(editor.$$.fragment);
    			t1 = space();
    			create_component(console.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			claim_component(navbar.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			section = claim_element(main_nodes, "SECTION", { class: true });
    			var section_nodes = children(section);
    			claim_component(editor.$$.fragment, section_nodes);
    			t1 = claim_space(section_nodes);
    			claim_component(console.$$.fragment, section_nodes);
    			section_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(section, "class", "svelte-uqnmep");
    			add_location(section, file$2, 8, 2, 170);
    			attr_dev(main, "class", "svelte-uqnmep");
    			add_location(main, file$2, 6, 0, 148);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_hydration_dev(main, t0);
    			append_hydration_dev(main, section);
    			mount_component(editor, section, null);
    			append_hydration_dev(section, t1);
    			mount_component(console, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(editor.$$.fragment, local);
    			transition_in(console.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(editor.$$.fragment, local);
    			transition_out(console.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(editor);
    			destroy_component(console);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WebEditor', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<WebEditor> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Editor, Console, Navbar });
    	return [];
    }

    class WebEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WebEditor",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/home/Home.svelte generated by Svelte v3.42.5 */
    const file$1 = "src/home/Home.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let h1;
    	let t1;
    	let current;
    	navbar = new Navbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			t1 = text$1("Home Page");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			claim_component(navbar.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			h1 = claim_element(main_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, "Home Page");
    			h1_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$1, 6, 2, 87);
    			attr_dev(main, "class", "svelte-jdzb5c");
    			add_location(main, file$1, 4, 0, 66);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_hydration_dev(main, t0);
    			append_hydration_dev(main, h1);
    			append_hydration_dev(h1, t1);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
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
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Navbar });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.5 */
    const file = "src/App.svelte";

    // (9:0) <Router url="{url}">
    function create_default_slot(ctx) {
    	let div;
    	let route0;
    	let t;
    	let route1;
    	let current;

    	route0 = new Route({
    			props: { path: "editor", component: WebEditor },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(route0.$$.fragment);
    			t = space();
    			create_component(route1.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			claim_component(route0.$$.fragment, div_nodes);
    			t = claim_space(div_nodes);
    			claim_component(route1.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(div, file, 9, 2, 211);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			mount_component(route0, div, null);
    			append_hydration_dev(div, t);
    			mount_component(route1, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(route0);
    			destroy_component(route1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(9:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
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
    	let { url = "" } = $$props;
    	const writable_props = ['url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({ Router, Route, WebEditor, Home, url });

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // main.js

    const app = new App({
      target: document.body,
      hydrate: true
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
