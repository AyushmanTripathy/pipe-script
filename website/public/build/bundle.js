
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

    function create_fragment$a(ctx) {
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$a.name
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

    function create_fragment$9(ctx) {
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$9.name
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
        case "neg":
          return -1 * $1
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
      const var_name = target;
      target = value(target, vars);

      if (isPointer(target)) {
        target = pointer(target);
        if(var_name.startsWith('%array')) 
          target = `${var_name} : [${target}]`;
        else if(var_name.startsWith('%object'))
          target = `${var_name} : {Object}`;
      }
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
    const file$8 = "src/editor/Editor.svelte";

    function create_fragment$8(ctx) {
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
    			add_location(div, file$8, 59, 2, 1208);
    			attr_dev(main, "class", "svelte-1vbfj1z");
    			add_location(main, file$8, 58, 0, 1199);
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
    		id: create_fragment$8.name,
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

    function instance$8($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/editor/Console.svelte generated by Svelte v3.42.5 */
    const file$7 = "src/editor/Console.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(textarea, file$7, 10, 2, 128);
    			attr_dev(main, "class", "svelte-q6c650");
    			add_location(main, file$7, 9, 0, 119);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Console",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/util/Navbar.svelte generated by Svelte v3.42.5 */
    const file$6 = "src/util/Navbar.svelte";

    function create_fragment$6(ctx) {
    	let main;
    	let a0;
    	let t0;
    	let t1;
    	let a1;
    	let t2;
    	let t3;
    	let a2;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			a0 = element("a");
    			t0 = text$1("Home");
    			t1 = space();
    			a1 = element("a");
    			t2 = text$1("Docs");
    			t3 = space();
    			a2 = element("a");
    			t4 = text$1("Editor");
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
    			t2 = claim_text(a1_nodes, "Docs");
    			a1_nodes.forEach(detach_dev);
    			t3 = claim_space(main_nodes);
    			a2 = claim_element(main_nodes, "A", { href: true, class: true });
    			var a2_nodes = children(a2);
    			t4 = claim_text(a2_nodes, "Editor");
    			a2_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-1suob06");
    			add_location(a0, file$6, 5, 2, 70);
    			attr_dev(a1, "href", "/docs");
    			attr_dev(a1, "class", "svelte-1suob06");
    			add_location(a1, file$6, 6, 2, 102);
    			attr_dev(a2, "href", "/editor");
    			attr_dev(a2, "class", "svelte-1suob06");
    			add_location(a2, file$6, 7, 2, 138);
    			attr_dev(main, "class", "svelte-1suob06");
    			add_location(main, file$6, 4, 0, 61);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			append_hydration_dev(main, a0);
    			append_hydration_dev(a0, t0);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, a1);
    			append_hydration_dev(a1, t2);
    			append_hydration_dev(main, t3);
    			append_hydration_dev(main, a2);
    			append_hydration_dev(a2, t4);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					action_destroyer(link.call(null, a1)),
    					action_destroyer(link.call(null, a2))
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/editor/WebEditor.svelte generated by Svelte v3.42.5 */

    const { console: console_1 } = globals;
    const file$5 = "src/editor/WebEditor.svelte";

    function create_fragment$5(ctx) {
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
    			attr_dev(section, "class", "svelte-cie27c");
    			add_location(section, file$5, 8, 2, 170);
    			attr_dev(main, "class", "svelte-cie27c");
    			add_location(main, file$5, 6, 0, 148);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WebEditor",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/home/Home.svelte generated by Svelte v3.42.5 */
    const file$4 = "src/home/Home.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let h1;
    	let t1;
    	let t2;
    	let p0;
    	let t3;
    	let t4;
    	let p1;
    	let t5;
    	let current;
    	navbar = new Navbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			t1 = text$1("Pipescript");
    			t2 = space();
    			p0 = element("p");
    			t3 = text$1("A programming language that revolves around piping.");
    			t4 = space();
    			p1 = element("p");
    			t5 = text$1("home page is still in development");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			claim_component(navbar.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			h1 = claim_element(main_nodes, "H1", {});
    			var h1_nodes = children(h1);
    			t1 = claim_text(h1_nodes, "Pipescript");
    			h1_nodes.forEach(detach_dev);
    			t2 = claim_space(main_nodes);
    			p0 = claim_element(main_nodes, "P", {});
    			var p0_nodes = children(p0);
    			t3 = claim_text(p0_nodes, "A programming language that revolves around piping.");
    			p0_nodes.forEach(detach_dev);
    			t4 = claim_space(main_nodes);
    			p1 = claim_element(main_nodes, "P", {});
    			var p1_nodes = children(p1);
    			t5 = claim_text(p1_nodes, "home page is still in development");
    			p1_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h1, file$4, 6, 2, 88);
    			add_location(p0, file$4, 7, 2, 110);
    			add_location(p1, file$4, 8, 2, 171);
    			attr_dev(main, "class", "svelte-jdzb5c");
    			add_location(main, file$4, 4, 0, 66);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_hydration_dev(main, t0);
    			append_hydration_dev(main, h1);
    			append_hydration_dev(h1, t1);
    			append_hydration_dev(main, t2);
    			append_hydration_dev(main, p0);
    			append_hydration_dev(p0, t3);
    			append_hydration_dev(main, t4);
    			append_hydration_dev(main, p1);
    			append_hydration_dev(p1, t5);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/docs/Content.svelte generated by Svelte v3.42.5 */

    const file$3 = "src/docs/Content.svelte";

    function create_fragment$3(ctx) {
    	let h10;
    	let t0;
    	let t1;
    	let p0;
    	let t2;
    	let t3;
    	let p1;
    	let t4;
    	let t5;
    	let h30;
    	let t6;
    	let t7;
    	let ol;
    	let li0;
    	let t8;
    	let t9;
    	let li1;
    	let t10;
    	let t11;
    	let li2;
    	let t12;
    	let t13;
    	let li3;
    	let t14;
    	let t15;
    	let h20;
    	let t16;
    	let t17;
    	let p2;
    	let t18;
    	let t19;
    	let pre0;
    	let code0;
    	let t20;
    	let t21;
    	let h21;
    	let t22;
    	let t23;
    	let p3;
    	let t24;
    	let t25;
    	let pre1;
    	let code1;
    	let t26;
    	let t27;
    	let h22;
    	let t28;
    	let t29;
    	let p4;
    	let t30;
    	let t31;
    	let pre2;
    	let code2;
    	let t32;
    	let t33;
    	let h23;
    	let t34;
    	let t35;
    	let p5;
    	let t36;
    	let t37;
    	let pre3;
    	let code3;
    	let t38;
    	let t39;
    	let h24;
    	let t40;
    	let t41;
    	let p6;
    	let t42;
    	let t43;
    	let pre4;
    	let code4;
    	let t44;
    	let t45;
    	let h11;
    	let t46;
    	let t47;
    	let h12;
    	let t48;
    	let t49;
    	let h31;
    	let t50;
    	let t51;
    	let p7;
    	let t52;
    	let t53;
    	let h32;
    	let t54;
    	let t55;
    	let p8;
    	let t56;
    	let t57;
    	let pre5;
    	let code5;
    	let t58;
    	let t59;
    	let p9;
    	let t60;
    	let br0;
    	let t61;
    	let t62;
    	let h33;
    	let t63;
    	let t64;
    	let p10;
    	let t65;
    	let t66;
    	let h34;
    	let t67;
    	let t68;
    	let p11;
    	let t69;
    	let br1;
    	let t70;
    	let t71;
    	let h35;
    	let t72;
    	let t73;
    	let p12;
    	let t74;
    	let t75;
    	let h13;
    	let t76;
    	let t77;
    	let p13;
    	let t78;
    	let t79;
    	let pre6;
    	let code6;
    	let t80;
    	let t81;
    	let p14;
    	let code7;
    	let t82;
    	let t83;
    	let t84;
    	let h25;
    	let t85;
    	let t86;
    	let p15;
    	let t87;
    	let t88;
    	let pre7;
    	let code8;
    	let t89;
    	let t90;
    	let h36;
    	let t91;
    	let t92;
    	let p16;
    	let t93;
    	let t94;
    	let table0;
    	let thead0;
    	let tr0;
    	let th0;
    	let t95;
    	let t96;
    	let th1;
    	let t97;
    	let t98;
    	let th2;
    	let t99;
    	let t100;
    	let th3;
    	let t101;
    	let t102;
    	let tbody0;
    	let tr1;
    	let td0;
    	let t103;
    	let t104;
    	let td1;
    	let t105;
    	let t106;
    	let td2;
    	let t107;
    	let t108;
    	let td3;
    	let t109;
    	let t110;
    	let tr2;
    	let td4;
    	let t111;
    	let t112;
    	let td5;
    	let t113;
    	let t114;
    	let td6;
    	let t115;
    	let t116;
    	let td7;
    	let t117;
    	let t118;
    	let tr3;
    	let td8;
    	let t119;
    	let t120;
    	let td9;
    	let t121;
    	let t122;
    	let td10;
    	let t123;
    	let t124;
    	let td11;
    	let t125;
    	let t126;
    	let tr4;
    	let td12;
    	let t127;
    	let t128;
    	let td13;
    	let t129;
    	let t130;
    	let td14;
    	let t131;
    	let t132;
    	let td15;
    	let t133;
    	let t134;
    	let tr5;
    	let td16;
    	let t135;
    	let t136;
    	let td17;
    	let t137;
    	let t138;
    	let td18;
    	let t139;
    	let t140;
    	let td19;
    	let t141;
    	let t142;
    	let tr6;
    	let td20;
    	let t143;
    	let t144;
    	let td21;
    	let t145;
    	let t146;
    	let td22;
    	let t147;
    	let t148;
    	let td23;
    	let t149;
    	let t150;
    	let tr7;
    	let td24;
    	let t151;
    	let t152;
    	let td25;
    	let t153;
    	let t154;
    	let td26;
    	let t155;
    	let t156;
    	let td27;
    	let t157;
    	let t158;
    	let tr8;
    	let td28;
    	let t159;
    	let t160;
    	let td29;
    	let t161;
    	let t162;
    	let td30;
    	let t163;
    	let t164;
    	let td31;
    	let t165;
    	let t166;
    	let h26;
    	let t167;
    	let t168;
    	let p17;
    	let t169;
    	let t170;
    	let pre8;
    	let code9;
    	let t171;
    	let t172;
    	let h37;
    	let t173;
    	let t174;
    	let table1;
    	let thead1;
    	let tr9;
    	let th4;
    	let t175;
    	let t176;
    	let th5;
    	let t177;
    	let t178;
    	let th6;
    	let t179;
    	let t180;
    	let th7;
    	let t181;
    	let t182;
    	let tbody1;
    	let tr10;
    	let td32;
    	let t183;
    	let h27;
    	let t184;
    	let t185;
    	let p18;
    	let t186;
    	let code10;
    	let t187;
    	let t188;
    	let t189;
    	let pre9;
    	let code11;
    	let t190;
    	let t191;
    	let h38;
    	let t192;
    	let t193;
    	let table2;
    	let thead2;
    	let tr11;
    	let th8;
    	let t194;
    	let t195;
    	let th9;
    	let t196;
    	let t197;
    	let th10;
    	let t198;
    	let t199;
    	let th11;
    	let t200;
    	let t201;
    	let tbody2;
    	let tr12;
    	let td33;
    	let t202;
    	let h14;
    	let t203;
    	let t204;
    	let p19;
    	let t205;
    	let t206;
    	let h28;
    	let t207;
    	let t208;
    	let p20;
    	let t209;
    	let t210;
    	let pre10;
    	let code12;
    	let t211;
    	let t212;
    	let p21;
    	let strong0;
    	let t213;
    	let t214;
    	let br2;
    	let strong1;
    	let t215;
    	let t216;
    	let t217;
    	let h29;
    	let t218;
    	let t219;
    	let p22;
    	let t220;
    	let t221;
    	let pre11;
    	let code13;
    	let t222;
    	let t223;
    	let p23;
    	let t224;
    	let t225;
    	let pre12;
    	let code14;
    	let t226;
    	let t227;
    	let p24;
    	let strong2;
    	let t228;
    	let t229;
    	let br3;
    	let strong3;
    	let t230;
    	let t231;
    	let t232;
    	let h210;
    	let t233;
    	let t234;
    	let p25;
    	let t235;
    	let t236;
    	let pre13;
    	let code15;
    	let t237;
    	let t238;
    	let p26;
    	let strong4;
    	let t239;
    	let t240;
    	let br4;
    	let strong5;
    	let t241;
    	let t242;
    	let t243;
    	let h211;
    	let t244;
    	let t245;
    	let p27;
    	let t246;
    	let t247;
    	let pre14;
    	let code16;
    	let t248;
    	let t249;
    	let p28;
    	let strong6;
    	let t250;
    	let t251;
    	let br5;
    	let strong7;
    	let t252;
    	let t253;
    	let t254;
    	let h212;
    	let t255;
    	let t256;
    	let p29;
    	let t257;
    	let t258;
    	let pre15;
    	let code17;
    	let t259;
    	let t260;
    	let p30;
    	let strong8;
    	let t261;
    	let t262;
    	let br6;
    	let strong9;
    	let t263;
    	let t264;
    	let t265;
    	let h213;
    	let t266;
    	let t267;
    	let p31;
    	let t268;
    	let t269;
    	let h39;
    	let t270;
    	let t271;
    	let table3;
    	let thead3;
    	let tr13;
    	let th12;
    	let t272;
    	let t273;
    	let th13;
    	let t274;
    	let t275;
    	let th14;
    	let t276;
    	let t277;
    	let th15;
    	let t278;
    	let t279;
    	let tbody3;
    	let tr14;
    	let td34;
    	let t280;
    	let t281;
    	let td35;
    	let t282;
    	let t283;
    	let td36;
    	let t284;
    	let t285;
    	let td37;
    	let t286;
    	let t287;
    	let tr15;
    	let td38;
    	let t288;
    	let t289;
    	let td39;
    	let t290;
    	let t291;
    	let td40;
    	let t292;
    	let t293;
    	let td41;
    	let t294;
    	let t295;
    	let tr16;
    	let td42;
    	let t296;
    	let t297;
    	let td43;
    	let t298;
    	let t299;
    	let td44;
    	let t300;
    	let t301;
    	let td45;
    	let t302;
    	let t303;
    	let tr17;
    	let td46;
    	let t304;
    	let t305;
    	let td47;
    	let t306;
    	let t307;
    	let td48;
    	let t308;
    	let t309;
    	let td49;
    	let t310;
    	let t311;
    	let tr18;
    	let td50;
    	let t312;
    	let t313;
    	let td51;
    	let t314;
    	let t315;
    	let td52;
    	let t316;
    	let t317;
    	let td53;
    	let t318;
    	let t319;
    	let h310;
    	let t320;
    	let t321;
    	let table4;
    	let thead4;
    	let tr19;
    	let th16;
    	let t322;
    	let t323;
    	let th17;
    	let t324;
    	let t325;
    	let th18;
    	let t326;
    	let t327;
    	let th19;
    	let t328;
    	let t329;
    	let tbody4;
    	let tr20;
    	let td54;
    	let t330;
    	let t331;
    	let td55;
    	let t332;
    	let t333;
    	let td56;
    	let t334;
    	let t335;
    	let td57;
    	let t336;
    	let t337;
    	let tr21;
    	let td58;
    	let t338;
    	let t339;
    	let td59;
    	let t340;
    	let t341;
    	let td60;
    	let t342;
    	let t343;
    	let td61;
    	let t344;
    	let t345;
    	let tr22;
    	let td62;
    	let t346;
    	let t347;
    	let td63;
    	let t348;
    	let t349;
    	let td64;
    	let t350;
    	let t351;
    	let td65;
    	let t352;
    	let t353;
    	let tr23;
    	let td66;
    	let t354;
    	let t355;
    	let td67;
    	let t356;
    	let t357;
    	let td68;
    	let t358;
    	let t359;
    	let td69;
    	let t360;
    	let t361;
    	let h214;
    	let t362;
    	let t363;
    	let table5;
    	let thead5;
    	let tr24;
    	let th20;
    	let t364;
    	let t365;
    	let th21;
    	let t366;
    	let t367;
    	let th22;
    	let t368;
    	let t369;
    	let th23;
    	let t370;
    	let t371;
    	let tbody5;
    	let tr25;
    	let td70;
    	let t372;
    	let t373;
    	let td71;
    	let t374;
    	let t375;
    	let td72;
    	let t376;
    	let t377;
    	let td73;
    	let t378;
    	let t379;
    	let tr26;
    	let td74;
    	let t380;
    	let t381;
    	let td75;
    	let t382;
    	let t383;
    	let td76;
    	let t384;
    	let t385;
    	let td77;
    	let t386;
    	let t387;
    	let tr27;
    	let td78;
    	let t388;
    	let t389;
    	let td79;
    	let t390;
    	let t391;
    	let td80;
    	let t392;
    	let t393;
    	let td81;
    	let t394;
    	let t395;
    	let tr28;
    	let td82;
    	let t396;
    	let t397;
    	let td83;
    	let t398;
    	let t399;
    	let td84;
    	let t400;
    	let t401;
    	let td85;
    	let t402;
    	let t403;
    	let tr29;
    	let td86;
    	let t404;
    	let t405;
    	let td87;
    	let t406;
    	let t407;
    	let td88;
    	let t408;
    	let t409;
    	let td89;
    	let t410;
    	let t411;
    	let tr30;
    	let td90;
    	let t412;
    	let t413;
    	let td91;
    	let t414;
    	let t415;
    	let td92;
    	let t416;
    	let t417;
    	let td93;
    	let t418;
    	let t419;
    	let tr31;
    	let td94;
    	let t420;
    	let t421;
    	let td95;
    	let t422;
    	let t423;
    	let td96;
    	let t424;
    	let t425;
    	let td97;
    	let t426;
    	let t427;
    	let h15;
    	let t428;
    	let t429;
    	let p32;
    	let t430;
    	let t431;
    	let h215;
    	let t432;
    	let t433;
    	let p33;
    	let t434;
    	let t435;
    	let pre16;
    	let code18;
    	let t436;
    	let t437;
    	let p34;
    	let t438;
    	let a0;
    	let t439;
    	let t440;
    	let p35;
    	let t441;
    	let t442;
    	let pre17;
    	let code19;
    	let t443;
    	let t444;
    	let h216;
    	let t445;
    	let t446;
    	let p36;
    	let t447;
    	let t448;
    	let p37;
    	let t449;
    	let br7;
    	let t450;
    	let t451;
    	let pre18;
    	let code20;
    	let t452;
    	let t453;
    	let p38;
    	let t454;
    	let a1;
    	let t455;
    	let t456;
    	let p39;
    	let t457;
    	let t458;
    	let pre19;
    	let code21;
    	let t459;
    	let t460;
    	let h16;
    	let t461;
    	let t462;
    	let p40;
    	let t463;
    	let a2;
    	let t464;
    	let t465;
    	let h217;
    	let t466;
    	let t467;
    	let p41;
    	let t468;
    	let t469;
    	let pre20;
    	let code22;
    	let t470;
    	let t471;
    	let p42;
    	let t472;
    	let t473;
    	let pre21;
    	let code23;
    	let t474;
    	let t475;
    	let h218;
    	let t476;
    	let t477;
    	let p43;
    	let t478;
    	let t479;
    	let pre22;
    	let code24;
    	let t480;
    	let t481;
    	let p44;
    	let t482;
    	let t483;
    	let pre23;
    	let code25;
    	let t484;
    	let t485;
    	let h219;
    	let t486;
    	let t487;
    	let p45;
    	let t488;
    	let t489;
    	let pre24;
    	let code26;
    	let t490;
    	let t491;
    	let p46;
    	let t492;
    	let t493;
    	let pre25;
    	let code27;
    	let t494;

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			t0 = text$1("Concepts");
    			t1 = space();
    			p0 = element("p");
    			t2 = text$1("Pipescript is functional, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.");
    			t3 = space();
    			p1 = element("p");
    			t4 = text$1("Pipescript can be interpreted directly or be compiled into javascript.");
    			t5 = space();
    			h30 = element("h3");
    			t6 = text$1("Believes");
    			t7 = space();
    			ol = element("ol");
    			li0 = element("li");
    			t8 = text$1("commands for everything");
    			t9 = space();
    			li1 = element("li");
    			t10 = text$1("human readble code");
    			t11 = space();
    			li2 = element("li");
    			t12 = text$1("using piping for everything posible");
    			t13 = space();
    			li3 = element("li");
    			t14 = text$1("using less symbols");
    			t15 = space();
    			h20 = element("h2");
    			t16 = text$1("Variables");
    			t17 = space();
    			p2 = element("p");
    			t18 = text$1("Variables are declared using set command. use $ to use Variables. use -$ sign to get negative");
    			t19 = space();
    			pre0 = element("pre");
    			code0 = element("code");
    			t20 = text$1("# setting variable\nset var 10\n\n# using variables\nlog $var\nlog -$var");
    			t21 = space();
    			h21 = element("h2");
    			t22 = text$1("Comments");
    			t23 = space();
    			p3 = element("p");
    			t24 = text$1("use # to write comments and ## to write multi-line comments");
    			t25 = space();
    			pre1 = element("pre");
    			code1 = element("code");
    			t26 = text$1("# this is comment\n\n##\nthis is a comment\nthis also is a comment\n##");
    			t27 = space();
    			h22 = element("h2");
    			t28 = text$1("Piping");
    			t29 = space();
    			p4 = element("p");
    			t30 = text$1("use | to use output of one command as input of another");
    			t31 = space();
    			pre2 = element("pre");
    			code2 = element("code");
    			t32 = text$1("log | add 1 1\n\n# how it is processed\n\nlog | add 1 1\nlog 2\n\nset n | add 1 | multiply 1 2\nset n | add 1 2\nset n 3");
    			t33 = space();
    			h23 = element("h2");
    			t34 = text$1("Code Block");
    			t35 = space();
    			p5 = element("p");
    			t36 = text$1("[ ] are used encapsulate code");
    			t37 = space();
    			pre3 = element("pre");
    			code3 = element("code");
    			t38 = text$1("log [add 1 1]\n\n# how it is processed\nlog [add 1 1]\nlog 2\n\nlog [add 1 1] [add 1 1]\nlog 2 2");
    			t39 = space();
    			h24 = element("h2");
    			t40 = text$1("Functions");
    			t41 = space();
    			p6 = element("p");
    			t42 = text$1("functions as usual");
    			t43 = space();
    			pre4 = element("pre");
    			code4 = element("code");
    			t44 = text$1("function <name> $arg1 $arg2\n  return $arg1\n\nfunction example $n\n  return | add $n 10");
    			t45 = space();
    			h11 = element("h1");
    			t46 = text$1("Data Types");
    			t47 = space();
    			h12 = element("h1");
    			t48 = text$1("Primitive");
    			t49 = space();
    			h31 = element("h3");
    			t50 = text$1("Number");
    			t51 = space();
    			p7 = element("p");
    			t52 = text$1("Number include integer and floats");
    			t53 = space();
    			h32 = element("h3");
    			t54 = text$1("Word");
    			t55 = space();
    			p8 = element("p");
    			t56 = text$1("basically string without spaces and quotes");
    			t57 = space();
    			pre5 = element("pre");
    			code5 = element("code");
    			t58 = text$1("log word");
    			t59 = space();
    			p9 = element("p");
    			t60 = text$1("NOTE");
    			br0 = element("br");
    			t61 = text$1("word type is not supported by the compiler. using word is not recommended");
    			t62 = space();
    			h33 = element("h3");
    			t63 = text$1("Boolean");
    			t64 = space();
    			p10 = element("p");
    			t65 = text$1("boolean as usual");
    			t66 = space();
    			h34 = element("h3");
    			t67 = text$1("Null");
    			t68 = space();
    			p11 = element("p");
    			t69 = text$1("null as usual");
    			br1 = element("br");
    			t70 = text$1("fun fact, function return null when return statement is not mentioned");
    			t71 = space();
    			h35 = element("h3");
    			t72 = text$1("Undefined");
    			t73 = space();
    			p12 = element("p");
    			t74 = text$1("undefined as usual;");
    			t75 = space();
    			h13 = element("h1");
    			t76 = text$1("Refrence");
    			t77 = space();
    			p13 = element("p");
    			t78 = text$1("refrence types have pointers that point to a js object, array, string. to see the pointer");
    			t79 = space();
    			pre6 = element("pre");
    			code6 = element("code");
    			t80 = text$1("log | new Array\n# output -> %array%@1 : []");
    			t81 = space();
    			p14 = element("p");
    			code7 = element("code");
    			t82 = text$1("%array%@1");
    			t83 = text$1(" is example for a pointer");
    			t84 = space();
    			h25 = element("h2");
    			t85 = text$1("Array");
    			t86 = space();
    			p15 = element("p");
    			t87 = text$1("use the new command to create a array");
    			t88 = space();
    			pre7 = element("pre");
    			code8 = element("code");
    			t89 = text$1("set arr | new Array");
    			t90 = space();
    			h36 = element("h3");
    			t91 = text$1("Array Commands");
    			t92 = space();
    			p16 = element("p");
    			t93 = text$1("array commands take array as first argument");
    			t94 = space();
    			table0 = element("table");
    			thead0 = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			t95 = text$1("command");
    			t96 = space();
    			th1 = element("th");
    			t97 = text$1("definition");
    			t98 = space();
    			th2 = element("th");
    			t99 = text$1("args no");
    			t100 = space();
    			th3 = element("th");
    			t101 = text$1("js equivalent");
    			t102 = space();
    			tbody0 = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			t103 = text$1("pop");
    			t104 = space();
    			td1 = element("td");
    			t105 = text$1("pop last element");
    			t106 = space();
    			td2 = element("td");
    			t107 = text$1("1");
    			t108 = space();
    			td3 = element("td");
    			t109 = text$1(".pop()");
    			t110 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			t111 = text$1("shift");
    			t112 = space();
    			td5 = element("td");
    			t113 = text$1("pop first element");
    			t114 = space();
    			td6 = element("td");
    			t115 = text$1("1");
    			t116 = space();
    			td7 = element("td");
    			t117 = text$1(".shift()");
    			t118 = space();
    			tr3 = element("tr");
    			td8 = element("td");
    			t119 = text$1("length");
    			t120 = space();
    			td9 = element("td");
    			t121 = text$1("length of array");
    			t122 = space();
    			td10 = element("td");
    			t123 = text$1("1");
    			t124 = space();
    			td11 = element("td");
    			t125 = text$1(".length");
    			t126 = space();
    			tr4 = element("tr");
    			td12 = element("td");
    			t127 = text$1("reverse");
    			t128 = space();
    			td13 = element("td");
    			t129 = text$1("reverse the array");
    			t130 = space();
    			td14 = element("td");
    			t131 = text$1("1");
    			t132 = space();
    			td15 = element("td");
    			t133 = text$1(".reverse()");
    			t134 = space();
    			tr5 = element("tr");
    			td16 = element("td");
    			t135 = text$1("last");
    			t136 = space();
    			td17 = element("td");
    			t137 = text$1("last element of array");
    			t138 = space();
    			td18 = element("td");
    			t139 = text$1("1");
    			t140 = space();
    			td19 = element("td");
    			t141 = text$1("arr[arr.length-1]");
    			t142 = space();
    			tr6 = element("tr");
    			td20 = element("td");
    			t143 = text$1("push");
    			t144 = space();
    			td21 = element("td");
    			t145 = text$1("push $1 to end of array");
    			t146 = space();
    			td22 = element("td");
    			t147 = text$1("2");
    			t148 = space();
    			td23 = element("td");
    			t149 = text$1(".push()");
    			t150 = space();
    			tr7 = element("tr");
    			td24 = element("td");
    			t151 = text$1("unshift");
    			t152 = space();
    			td25 = element("td");
    			t153 = text$1("push $1 to start of array");
    			t154 = space();
    			td26 = element("td");
    			t155 = text$1("2");
    			t156 = space();
    			td27 = element("td");
    			t157 = text$1(".unshift()");
    			t158 = space();
    			tr8 = element("tr");
    			td28 = element("td");
    			t159 = text$1("includes");
    			t160 = space();
    			td29 = element("td");
    			t161 = text$1("check if includes $1");
    			t162 = space();
    			td30 = element("td");
    			t163 = text$1("2");
    			t164 = space();
    			td31 = element("td");
    			t165 = text$1(".includes()");
    			t166 = space();
    			h26 = element("h2");
    			t167 = text$1("Object");
    			t168 = space();
    			p17 = element("p");
    			t169 = text$1("use the new command to create a array");
    			t170 = space();
    			pre8 = element("pre");
    			code9 = element("code");
    			t171 = text$1("set obj | new Object");
    			t172 = space();
    			h37 = element("h3");
    			t173 = text$1("Object Commands");
    			t174 = space();
    			table1 = element("table");
    			thead1 = element("thead");
    			tr9 = element("tr");
    			th4 = element("th");
    			t175 = text$1("command");
    			t176 = space();
    			th5 = element("th");
    			t177 = text$1("definition");
    			t178 = space();
    			th6 = element("th");
    			t179 = text$1("args no");
    			t180 = space();
    			th7 = element("th");
    			t181 = text$1("js equivalent");
    			t182 = space();
    			tbody1 = element("tbody");
    			tr10 = element("tr");
    			td32 = element("td");
    			t183 = space();
    			h27 = element("h2");
    			t184 = text$1("String");
    			t185 = space();
    			p18 = element("p");
    			t186 = text$1("single quotes ");
    			code10 = element("code");
    			t187 = text$1("' '");
    			t188 = text$1(" are used to declare string");
    			t189 = space();
    			pre9 = element("pre");
    			code11 = element("code");
    			t190 = text$1("log 'this is a string'");
    			t191 = space();
    			h38 = element("h3");
    			t192 = text$1("String Commands");
    			t193 = space();
    			table2 = element("table");
    			thead2 = element("thead");
    			tr11 = element("tr");
    			th8 = element("th");
    			t194 = text$1("command");
    			t195 = space();
    			th9 = element("th");
    			t196 = text$1("definition");
    			t197 = space();
    			th10 = element("th");
    			t198 = text$1("args no");
    			t199 = space();
    			th11 = element("th");
    			t200 = text$1("js equivalent");
    			t201 = space();
    			tbody2 = element("tbody");
    			tr12 = element("tr");
    			td33 = element("td");
    			t202 = space();
    			h14 = element("h1");
    			t203 = text$1("Commands");
    			t204 = space();
    			p19 = element("p");
    			t205 = text$1("mostly every thing in pipescript is done using commands. command takes arguments and return a output.");
    			t206 = space();
    			h28 = element("h2");
    			t207 = text$1("set");
    			t208 = space();
    			p20 = element("p");
    			t209 = text$1("used for setting variables");
    			t210 = space();
    			pre10 = element("pre");
    			code12 = element("code");
    			t211 = text$1("set <name> <value>\n\nset n 100");
    			t212 = space();
    			p21 = element("p");
    			strong0 = element("strong");
    			t213 = text$1("return value");
    			t214 = text$1(" : null");
    			br2 = element("br");
    			strong1 = element("strong");
    			t215 = text$1("arguments");
    			t216 = text$1(" : var-name, value");
    			t217 = space();
    			h29 = element("h2");
    			t218 = text$1("get");
    			t219 = space();
    			p22 = element("p");
    			t220 = text$1("get index or key of refrence types");
    			t221 = space();
    			pre11 = element("pre");
    			code13 = element("code");
    			t222 = text$1("get <refrence-type> <keys/indexs>");
    			t223 = space();
    			p23 = element("p");
    			t224 = text$1("example");
    			t225 = space();
    			pre12 = element("pre");
    			code14 = element("code");
    			t226 = text$1("# pipescript form \n1. get $array 0\n2. get $array 0 10 'key'\n\n# javascript form\n1. array[0]\n2. array[0][10]['key']");
    			t227 = space();
    			p24 = element("p");
    			strong2 = element("strong");
    			t228 = text$1("return value");
    			t229 = text$1(" : target value");
    			br3 = element("br");
    			strong3 = element("strong");
    			t230 = text$1("arguments");
    			t231 = text$1(" : refrence-type, multiple key/index");
    			t232 = space();
    			h210 = element("h2");
    			t233 = text$1("log");
    			t234 = space();
    			p25 = element("p");
    			t235 = text$1("log multiple inputs to console");
    			t236 = space();
    			pre13 = element("pre");
    			code15 = element("code");
    			t237 = text$1("log <input> ...\n\nlog 'this string will get logged'\nlog 100 100 # 100100");
    			t238 = space();
    			p26 = element("p");
    			strong4 = element("strong");
    			t239 = text$1("return value");
    			t240 = text$1(" : null");
    			br4 = element("br");
    			strong5 = element("strong");
    			t241 = text$1("arguments");
    			t242 = text$1(" : input, input ...");
    			t243 = space();
    			h211 = element("h2");
    			t244 = text$1("call");
    			t245 = space();
    			p27 = element("p");
    			t246 = text$1("calling a function");
    			t247 = space();
    			pre14 = element("pre");
    			code16 = element("code");
    			t248 = text$1("call <function_name> <arg>\n\ncall process 10 10\n\nfunction process $a $b\n  return | add $a $b");
    			t249 = space();
    			p28 = element("p");
    			strong6 = element("strong");
    			t250 = text$1("return value");
    			t251 = text$1(" : the return value from called function");
    			br5 = element("br");
    			strong7 = element("strong");
    			t252 = text$1("arguments");
    			t253 = text$1(" : function-name, args for function");
    			t254 = space();
    			h212 = element("h2");
    			t255 = text$1("exit");
    			t256 = space();
    			p29 = element("p");
    			t257 = text$1("exit interpreting script");
    			t258 = space();
    			pre15 = element("pre");
    			code17 = element("code");
    			t259 = text$1("exit");
    			t260 = space();
    			p30 = element("p");
    			strong8 = element("strong");
    			t261 = text$1("return value");
    			t262 = text$1(" : null");
    			br6 = element("br");
    			strong9 = element("strong");
    			t263 = text$1("arguments");
    			t264 = text$1(" : none");
    			t265 = space();
    			h213 = element("h2");
    			t266 = text$1("Arithmetic");
    			t267 = space();
    			p31 = element("p");
    			t268 = text$1("Arithmetic commands");
    			t269 = space();
    			h39 = element("h3");
    			t270 = text$1("Operators");
    			t271 = space();
    			table3 = element("table");
    			thead3 = element("thead");
    			tr13 = element("tr");
    			th12 = element("th");
    			t272 = text$1("command");
    			t273 = space();
    			th13 = element("th");
    			t274 = text$1("definition");
    			t275 = space();
    			th14 = element("th");
    			t276 = text$1("args no");
    			t277 = space();
    			th15 = element("th");
    			t278 = text$1("js equivalent");
    			t279 = space();
    			tbody3 = element("tbody");
    			tr14 = element("tr");
    			td34 = element("td");
    			t280 = text$1("add");
    			t281 = space();
    			td35 = element("td");
    			t282 = text$1("adds multiple inputs");
    			t283 = space();
    			td36 = element("td");
    			t284 = text$1("multiple");
    			t285 = space();
    			td37 = element("td");
    			t286 = text$1("+");
    			t287 = space();
    			tr15 = element("tr");
    			td38 = element("td");
    			t288 = text$1("divide");
    			t289 = space();
    			td39 = element("td");
    			t290 = text$1("divde multiple inputs");
    			t291 = space();
    			td40 = element("td");
    			t292 = text$1("multiple");
    			t293 = space();
    			td41 = element("td");
    			t294 = text$1("/");
    			t295 = space();
    			tr16 = element("tr");
    			td42 = element("td");
    			t296 = text$1("multiply");
    			t297 = space();
    			td43 = element("td");
    			t298 = text$1("multiply multiple inputs");
    			t299 = space();
    			td44 = element("td");
    			t300 = text$1("multiple");
    			t301 = space();
    			td45 = element("td");
    			t302 = text$1("*");
    			t303 = space();
    			tr17 = element("tr");
    			td46 = element("td");
    			t304 = text$1("neg");
    			t305 = space();
    			td47 = element("td");
    			t306 = text$1("return $1 multiply by -1");
    			t307 = space();
    			td48 = element("td");
    			t308 = text$1("1");
    			t309 = space();
    			td49 = element("td");
    			t310 = text$1("-1 * input");
    			t311 = space();
    			tr18 = element("tr");
    			td50 = element("td");
    			t312 = text$1("reminder");
    			t313 = space();
    			td51 = element("td");
    			t314 = text$1("reminder of first / secound");
    			t315 = space();
    			td52 = element("td");
    			t316 = text$1("2");
    			t317 = space();
    			td53 = element("td");
    			t318 = text$1("%");
    			t319 = space();
    			h310 = element("h3");
    			t320 = text$1("Functions");
    			t321 = space();
    			table4 = element("table");
    			thead4 = element("thead");
    			tr19 = element("tr");
    			th16 = element("th");
    			t322 = text$1("command");
    			t323 = space();
    			th17 = element("th");
    			t324 = text$1("definition");
    			t325 = space();
    			th18 = element("th");
    			t326 = text$1("args no");
    			t327 = space();
    			th19 = element("th");
    			t328 = text$1("js equivalent");
    			t329 = space();
    			tbody4 = element("tbody");
    			tr20 = element("tr");
    			td54 = element("td");
    			t330 = text$1("floor");
    			t331 = space();
    			td55 = element("td");
    			t332 = text$1("floor the number");
    			t333 = space();
    			td56 = element("td");
    			t334 = text$1("1");
    			t335 = space();
    			td57 = element("td");
    			t336 = text$1("Math.floor()");
    			t337 = space();
    			tr21 = element("tr");
    			td58 = element("td");
    			t338 = text$1("pow");
    			t339 = space();
    			td59 = element("td");
    			t340 = text$1("power of $1 raised to $2");
    			t341 = space();
    			td60 = element("td");
    			t342 = text$1("2");
    			t343 = space();
    			td61 = element("td");
    			t344 = text$1("Math.pow()");
    			t345 = space();
    			tr22 = element("tr");
    			td62 = element("td");
    			t346 = text$1("random");
    			t347 = space();
    			td63 = element("td");
    			t348 = text$1("random number between 0 & 1");
    			t349 = space();
    			td64 = element("td");
    			t350 = text$1("0");
    			t351 = space();
    			td65 = element("td");
    			t352 = text$1("Math.random()");
    			t353 = space();
    			tr23 = element("tr");
    			td66 = element("td");
    			t354 = text$1("round");
    			t355 = space();
    			td67 = element("td");
    			t356 = text$1("round the number");
    			t357 = space();
    			td68 = element("td");
    			t358 = text$1("1");
    			t359 = space();
    			td69 = element("td");
    			t360 = text$1("Math.round()");
    			t361 = space();
    			h214 = element("h2");
    			t362 = text$1("Logic Operators");
    			t363 = space();
    			table5 = element("table");
    			thead5 = element("thead");
    			tr24 = element("tr");
    			th20 = element("th");
    			t364 = text$1("command");
    			t365 = space();
    			th21 = element("th");
    			t366 = text$1("definition");
    			t367 = space();
    			th22 = element("th");
    			t368 = text$1("args no");
    			t369 = space();
    			th23 = element("th");
    			t370 = text$1("js equivalent");
    			t371 = space();
    			tbody5 = element("tbody");
    			tr25 = element("tr");
    			td70 = element("td");
    			t372 = text$1("boolean");
    			t373 = space();
    			td71 = element("td");
    			t374 = text$1("change to boolean");
    			t375 = space();
    			td72 = element("td");
    			t376 = text$1("1");
    			t377 = space();
    			td73 = element("td");
    			t378 = text$1("Boolean()");
    			t379 = space();
    			tr26 = element("tr");
    			td74 = element("td");
    			t380 = text$1("eq");
    			t381 = space();
    			td75 = element("td");
    			t382 = text$1("equal to");
    			t383 = space();
    			td76 = element("td");
    			t384 = text$1("2");
    			t385 = space();
    			td77 = element("td");
    			t386 = text$1("==");
    			t387 = space();
    			tr27 = element("tr");
    			td78 = element("td");
    			t388 = text$1("ge");
    			t389 = space();
    			td79 = element("td");
    			t390 = text$1("greater than or equal");
    			t391 = space();
    			td80 = element("td");
    			t392 = text$1("2");
    			t393 = space();
    			td81 = element("td");
    			t394 = text$1(">=");
    			t395 = space();
    			tr28 = element("tr");
    			td82 = element("td");
    			t396 = text$1("gt");
    			t397 = space();
    			td83 = element("td");
    			t398 = text$1("greater than");
    			t399 = space();
    			td84 = element("td");
    			t400 = text$1("2");
    			t401 = space();
    			td85 = element("td");
    			t402 = text$1(">");
    			t403 = space();
    			tr29 = element("tr");
    			td86 = element("td");
    			t404 = text$1("le");
    			t405 = space();
    			td87 = element("td");
    			t406 = text$1("less than or equal");
    			t407 = space();
    			td88 = element("td");
    			t408 = text$1("2");
    			t409 = space();
    			td89 = element("td");
    			t410 = text$1("<=");
    			t411 = space();
    			tr30 = element("tr");
    			td90 = element("td");
    			t412 = text$1("lt");
    			t413 = space();
    			td91 = element("td");
    			t414 = text$1("less than");
    			t415 = space();
    			td92 = element("td");
    			t416 = text$1("2");
    			t417 = space();
    			td93 = element("td");
    			t418 = text$1("<");
    			t419 = space();
    			tr31 = element("tr");
    			td94 = element("td");
    			t420 = text$1("not");
    			t421 = space();
    			td95 = element("td");
    			t422 = text$1("not operator");
    			t423 = space();
    			td96 = element("td");
    			t424 = text$1("1");
    			t425 = space();
    			td97 = element("td");
    			t426 = text$1("!");
    			t427 = space();
    			h15 = element("h1");
    			t428 = text$1("Conditional Flow");
    			t429 = space();
    			p32 = element("p");
    			t430 = text$1("\"do this\" or \"do that\" based on some condition.");
    			t431 = space();
    			h215 = element("h2");
    			t432 = text$1("If Statements");
    			t433 = space();
    			p33 = element("p");
    			t434 = text$1("if statements as usual");
    			t435 = space();
    			pre16 = element("pre");
    			code18 = element("code");
    			t436 = text$1("if <boolean>\n  # do something\nelseif <boolean>\n  # do something\nelse\n  # do something");
    			t437 = space();
    			p34 = element("p");
    			t438 = text$1("learn more about ");
    			a0 = element("a");
    			t439 = text$1("Logical Operators");
    			t440 = space();
    			p35 = element("p");
    			t441 = text$1("example");
    			t442 = space();
    			pre17 = element("pre");
    			code19 = element("code");
    			t443 = text$1("if | eq $n 0\n  log 'equal to 0'\nelseif | lt $n 0\n  log 'less than 0'\nelse\n  log 'something else'");
    			t444 = space();
    			h216 = element("h2");
    			t445 = text$1("Switch Case");
    			t446 = space();
    			p36 = element("p");
    			t447 = text$1("switch case as usual.");
    			t448 = space();
    			p37 = element("p");
    			t449 = text$1("NOTE");
    			br7 = element("br");
    			t450 = text$1("pipescript interpreter support multiple default blocks at diffrent levels but the compiler doesnot. the compiler collects all default blocks and puts all of them in single default block at the end of switch block");
    			t451 = space();
    			pre18 = element("pre");
    			code20 = element("code");
    			t452 = text$1("switch <input>\n  case <value>\n    # do something\n    # break to stop here\n  case <value>\n    # do something\n    # break to stop here\n  default\n    # do something");
    			t453 = space();
    			p38 = element("p");
    			t454 = text$1("learn more about ");
    			a1 = element("a");
    			t455 = text$1("Arithmetic commands");
    			t456 = space();
    			p39 = element("p");
    			t457 = text$1("example");
    			t458 = space();
    			pre19 = element("pre");
    			code21 = element("code");
    			t459 = text$1("set n 10\n\nswitch $n\n  case 10\n    log 10\n    break\n  case | add 1 1\n    log 1\n  default\n    log 'default'");
    			t460 = space();
    			h16 = element("h1");
    			t461 = text$1("Iteration");
    			t462 = space();
    			p40 = element("p");
    			t463 = text$1("learn more about ");
    			a2 = element("a");
    			t464 = text$1("Logical Operators");
    			t465 = space();
    			h217 = element("h2");
    			t466 = text$1("While Loop");
    			t467 = space();
    			p41 = element("p");
    			t468 = text$1("while loop as usual");
    			t469 = space();
    			pre20 = element("pre");
    			code22 = element("code");
    			t470 = text$1("while <condition>\n  # do something\n  # break to stop");
    			t471 = space();
    			p42 = element("p");
    			t472 = text$1("example");
    			t473 = space();
    			pre21 = element("pre");
    			code23 = element("code");
    			t474 = text$1("set n 0\n\nwhile | ge 10 $n\n  set n | add $n 1\n  log $n");
    			t475 = space();
    			h218 = element("h2");
    			t476 = text$1("Basic Loop");
    			t477 = space();
    			p43 = element("p");
    			t478 = text$1("loop for certain times");
    			t479 = space();
    			pre22 = element("pre");
    			code24 = element("code");
    			t480 = text$1("loop <number>\n  # do something\n  # break to stop");
    			t481 = space();
    			p44 = element("p");
    			t482 = text$1("example");
    			t483 = space();
    			pre23 = element("pre");
    			code25 = element("code");
    			t484 = text$1("loop 10\n  log 'still looping'");
    			t485 = space();
    			h219 = element("h2");
    			t486 = text$1("Foreach Loop");
    			t487 = space();
    			p45 = element("p");
    			t488 = text$1("loop through items in something iterable ( arrays, objects, string)");
    			t489 = space();
    			pre24 = element("pre");
    			code26 = element("code");
    			t490 = text$1("foreach <var> <something iterable>\n  # do something\n  # break to stop");
    			t491 = space();
    			p46 = element("p");
    			t492 = text$1("example");
    			t493 = space();
    			pre25 = element("pre");
    			code27 = element("code");
    			t494 = text$1("set array | new Array\n\nforeach $value $array\n  log $value");
    			this.h();
    		},
    		l: function claim(nodes) {
    			h10 = claim_element(nodes, "H1", { id: true });
    			var h10_nodes = children(h10);
    			t0 = claim_text(h10_nodes, "Concepts");
    			h10_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			p0 = claim_element(nodes, "P", {});
    			var p0_nodes = children(p0);
    			t2 = claim_text(p0_nodes, "Pipescript is functional, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.");
    			p0_nodes.forEach(detach_dev);
    			t3 = claim_space(nodes);
    			p1 = claim_element(nodes, "P", {});
    			var p1_nodes = children(p1);
    			t4 = claim_text(p1_nodes, "Pipescript can be interpreted directly or be compiled into javascript.");
    			p1_nodes.forEach(detach_dev);
    			t5 = claim_space(nodes);
    			h30 = claim_element(nodes, "H3", { id: true });
    			var h30_nodes = children(h30);
    			t6 = claim_text(h30_nodes, "Believes");
    			h30_nodes.forEach(detach_dev);
    			t7 = claim_space(nodes);
    			ol = claim_element(nodes, "OL", {});
    			var ol_nodes = children(ol);
    			li0 = claim_element(ol_nodes, "LI", {});
    			var li0_nodes = children(li0);
    			t8 = claim_text(li0_nodes, "commands for everything");
    			li0_nodes.forEach(detach_dev);
    			t9 = claim_space(ol_nodes);
    			li1 = claim_element(ol_nodes, "LI", {});
    			var li1_nodes = children(li1);
    			t10 = claim_text(li1_nodes, "human readble code");
    			li1_nodes.forEach(detach_dev);
    			t11 = claim_space(ol_nodes);
    			li2 = claim_element(ol_nodes, "LI", {});
    			var li2_nodes = children(li2);
    			t12 = claim_text(li2_nodes, "using piping for everything posible");
    			li2_nodes.forEach(detach_dev);
    			t13 = claim_space(ol_nodes);
    			li3 = claim_element(ol_nodes, "LI", {});
    			var li3_nodes = children(li3);
    			t14 = claim_text(li3_nodes, "using less symbols");
    			li3_nodes.forEach(detach_dev);
    			ol_nodes.forEach(detach_dev);
    			t15 = claim_space(nodes);
    			h20 = claim_element(nodes, "H2", { id: true });
    			var h20_nodes = children(h20);
    			t16 = claim_text(h20_nodes, "Variables");
    			h20_nodes.forEach(detach_dev);
    			t17 = claim_space(nodes);
    			p2 = claim_element(nodes, "P", {});
    			var p2_nodes = children(p2);
    			t18 = claim_text(p2_nodes, "Variables are declared using set command. use $ to use Variables. use -$ sign to get negative");
    			p2_nodes.forEach(detach_dev);
    			t19 = claim_space(nodes);
    			pre0 = claim_element(nodes, "PRE", {});
    			var pre0_nodes = children(pre0);
    			code0 = claim_element(pre0_nodes, "CODE", { class: true });
    			var code0_nodes = children(code0);
    			t20 = claim_text(code0_nodes, "# setting variable\nset var 10\n\n# using variables\nlog $var\nlog -$var");
    			code0_nodes.forEach(detach_dev);
    			pre0_nodes.forEach(detach_dev);
    			t21 = claim_space(nodes);
    			h21 = claim_element(nodes, "H2", { id: true });
    			var h21_nodes = children(h21);
    			t22 = claim_text(h21_nodes, "Comments");
    			h21_nodes.forEach(detach_dev);
    			t23 = claim_space(nodes);
    			p3 = claim_element(nodes, "P", {});
    			var p3_nodes = children(p3);
    			t24 = claim_text(p3_nodes, "use # to write comments and ## to write multi-line comments");
    			p3_nodes.forEach(detach_dev);
    			t25 = claim_space(nodes);
    			pre1 = claim_element(nodes, "PRE", {});
    			var pre1_nodes = children(pre1);
    			code1 = claim_element(pre1_nodes, "CODE", { class: true });
    			var code1_nodes = children(code1);
    			t26 = claim_text(code1_nodes, "# this is comment\n\n##\nthis is a comment\nthis also is a comment\n##");
    			code1_nodes.forEach(detach_dev);
    			pre1_nodes.forEach(detach_dev);
    			t27 = claim_space(nodes);
    			h22 = claim_element(nodes, "H2", { id: true });
    			var h22_nodes = children(h22);
    			t28 = claim_text(h22_nodes, "Piping");
    			h22_nodes.forEach(detach_dev);
    			t29 = claim_space(nodes);
    			p4 = claim_element(nodes, "P", {});
    			var p4_nodes = children(p4);
    			t30 = claim_text(p4_nodes, "use | to use output of one command as input of another");
    			p4_nodes.forEach(detach_dev);
    			t31 = claim_space(nodes);
    			pre2 = claim_element(nodes, "PRE", {});
    			var pre2_nodes = children(pre2);
    			code2 = claim_element(pre2_nodes, "CODE", { class: true });
    			var code2_nodes = children(code2);
    			t32 = claim_text(code2_nodes, "log | add 1 1\n\n# how it is processed\n\nlog | add 1 1\nlog 2\n\nset n | add 1 | multiply 1 2\nset n | add 1 2\nset n 3");
    			code2_nodes.forEach(detach_dev);
    			pre2_nodes.forEach(detach_dev);
    			t33 = claim_space(nodes);
    			h23 = claim_element(nodes, "H2", { id: true });
    			var h23_nodes = children(h23);
    			t34 = claim_text(h23_nodes, "Code Block");
    			h23_nodes.forEach(detach_dev);
    			t35 = claim_space(nodes);
    			p5 = claim_element(nodes, "P", {});
    			var p5_nodes = children(p5);
    			t36 = claim_text(p5_nodes, "[ ] are used encapsulate code");
    			p5_nodes.forEach(detach_dev);
    			t37 = claim_space(nodes);
    			pre3 = claim_element(nodes, "PRE", {});
    			var pre3_nodes = children(pre3);
    			code3 = claim_element(pre3_nodes, "CODE", { class: true });
    			var code3_nodes = children(code3);
    			t38 = claim_text(code3_nodes, "log [add 1 1]\n\n# how it is processed\nlog [add 1 1]\nlog 2\n\nlog [add 1 1] [add 1 1]\nlog 2 2");
    			code3_nodes.forEach(detach_dev);
    			pre3_nodes.forEach(detach_dev);
    			t39 = claim_space(nodes);
    			h24 = claim_element(nodes, "H2", { id: true });
    			var h24_nodes = children(h24);
    			t40 = claim_text(h24_nodes, "Functions");
    			h24_nodes.forEach(detach_dev);
    			t41 = claim_space(nodes);
    			p6 = claim_element(nodes, "P", {});
    			var p6_nodes = children(p6);
    			t42 = claim_text(p6_nodes, "functions as usual");
    			p6_nodes.forEach(detach_dev);
    			t43 = claim_space(nodes);
    			pre4 = claim_element(nodes, "PRE", {});
    			var pre4_nodes = children(pre4);
    			code4 = claim_element(pre4_nodes, "CODE", { class: true });
    			var code4_nodes = children(code4);
    			t44 = claim_text(code4_nodes, "function <name> $arg1 $arg2\n  return $arg1\n\nfunction example $n\n  return | add $n 10");
    			code4_nodes.forEach(detach_dev);
    			pre4_nodes.forEach(detach_dev);
    			t45 = claim_space(nodes);
    			h11 = claim_element(nodes, "H1", { id: true });
    			var h11_nodes = children(h11);
    			t46 = claim_text(h11_nodes, "Data Types");
    			h11_nodes.forEach(detach_dev);
    			t47 = claim_space(nodes);
    			h12 = claim_element(nodes, "H1", { id: true });
    			var h12_nodes = children(h12);
    			t48 = claim_text(h12_nodes, "Primitive");
    			h12_nodes.forEach(detach_dev);
    			t49 = claim_space(nodes);
    			h31 = claim_element(nodes, "H3", { id: true });
    			var h31_nodes = children(h31);
    			t50 = claim_text(h31_nodes, "Number");
    			h31_nodes.forEach(detach_dev);
    			t51 = claim_space(nodes);
    			p7 = claim_element(nodes, "P", {});
    			var p7_nodes = children(p7);
    			t52 = claim_text(p7_nodes, "Number include integer and floats");
    			p7_nodes.forEach(detach_dev);
    			t53 = claim_space(nodes);
    			h32 = claim_element(nodes, "H3", { id: true });
    			var h32_nodes = children(h32);
    			t54 = claim_text(h32_nodes, "Word");
    			h32_nodes.forEach(detach_dev);
    			t55 = claim_space(nodes);
    			p8 = claim_element(nodes, "P", {});
    			var p8_nodes = children(p8);
    			t56 = claim_text(p8_nodes, "basically string without spaces and quotes");
    			p8_nodes.forEach(detach_dev);
    			t57 = claim_space(nodes);
    			pre5 = claim_element(nodes, "PRE", {});
    			var pre5_nodes = children(pre5);
    			code5 = claim_element(pre5_nodes, "CODE", { class: true });
    			var code5_nodes = children(code5);
    			t58 = claim_text(code5_nodes, "log word");
    			code5_nodes.forEach(detach_dev);
    			pre5_nodes.forEach(detach_dev);
    			t59 = claim_space(nodes);
    			p9 = claim_element(nodes, "P", {});
    			var p9_nodes = children(p9);
    			t60 = claim_text(p9_nodes, "NOTE");
    			br0 = claim_element(p9_nodes, "BR", {});
    			t61 = claim_text(p9_nodes, "word type is not supported by the compiler. using word is not recommended");
    			p9_nodes.forEach(detach_dev);
    			t62 = claim_space(nodes);
    			h33 = claim_element(nodes, "H3", { id: true });
    			var h33_nodes = children(h33);
    			t63 = claim_text(h33_nodes, "Boolean");
    			h33_nodes.forEach(detach_dev);
    			t64 = claim_space(nodes);
    			p10 = claim_element(nodes, "P", {});
    			var p10_nodes = children(p10);
    			t65 = claim_text(p10_nodes, "boolean as usual");
    			p10_nodes.forEach(detach_dev);
    			t66 = claim_space(nodes);
    			h34 = claim_element(nodes, "H3", { id: true });
    			var h34_nodes = children(h34);
    			t67 = claim_text(h34_nodes, "Null");
    			h34_nodes.forEach(detach_dev);
    			t68 = claim_space(nodes);
    			p11 = claim_element(nodes, "P", {});
    			var p11_nodes = children(p11);
    			t69 = claim_text(p11_nodes, "null as usual");
    			br1 = claim_element(p11_nodes, "BR", {});
    			t70 = claim_text(p11_nodes, "fun fact, function return null when return statement is not mentioned");
    			p11_nodes.forEach(detach_dev);
    			t71 = claim_space(nodes);
    			h35 = claim_element(nodes, "H3", { id: true });
    			var h35_nodes = children(h35);
    			t72 = claim_text(h35_nodes, "Undefined");
    			h35_nodes.forEach(detach_dev);
    			t73 = claim_space(nodes);
    			p12 = claim_element(nodes, "P", {});
    			var p12_nodes = children(p12);
    			t74 = claim_text(p12_nodes, "undefined as usual;");
    			p12_nodes.forEach(detach_dev);
    			t75 = claim_space(nodes);
    			h13 = claim_element(nodes, "H1", { id: true });
    			var h13_nodes = children(h13);
    			t76 = claim_text(h13_nodes, "Refrence");
    			h13_nodes.forEach(detach_dev);
    			t77 = claim_space(nodes);
    			p13 = claim_element(nodes, "P", {});
    			var p13_nodes = children(p13);
    			t78 = claim_text(p13_nodes, "refrence types have pointers that point to a js object, array, string. to see the pointer");
    			p13_nodes.forEach(detach_dev);
    			t79 = claim_space(nodes);
    			pre6 = claim_element(nodes, "PRE", {});
    			var pre6_nodes = children(pre6);
    			code6 = claim_element(pre6_nodes, "CODE", { class: true });
    			var code6_nodes = children(code6);
    			t80 = claim_text(code6_nodes, "log | new Array\n# output -> %array%@1 : []");
    			code6_nodes.forEach(detach_dev);
    			pre6_nodes.forEach(detach_dev);
    			t81 = claim_space(nodes);
    			p14 = claim_element(nodes, "P", {});
    			var p14_nodes = children(p14);
    			code7 = claim_element(p14_nodes, "CODE", {});
    			var code7_nodes = children(code7);
    			t82 = claim_text(code7_nodes, "%array%@1");
    			code7_nodes.forEach(detach_dev);
    			t83 = claim_text(p14_nodes, " is example for a pointer");
    			p14_nodes.forEach(detach_dev);
    			t84 = claim_space(nodes);
    			h25 = claim_element(nodes, "H2", { id: true });
    			var h25_nodes = children(h25);
    			t85 = claim_text(h25_nodes, "Array");
    			h25_nodes.forEach(detach_dev);
    			t86 = claim_space(nodes);
    			p15 = claim_element(nodes, "P", {});
    			var p15_nodes = children(p15);
    			t87 = claim_text(p15_nodes, "use the new command to create a array");
    			p15_nodes.forEach(detach_dev);
    			t88 = claim_space(nodes);
    			pre7 = claim_element(nodes, "PRE", {});
    			var pre7_nodes = children(pre7);
    			code8 = claim_element(pre7_nodes, "CODE", { class: true });
    			var code8_nodes = children(code8);
    			t89 = claim_text(code8_nodes, "set arr | new Array");
    			code8_nodes.forEach(detach_dev);
    			pre7_nodes.forEach(detach_dev);
    			t90 = claim_space(nodes);
    			h36 = claim_element(nodes, "H3", { id: true });
    			var h36_nodes = children(h36);
    			t91 = claim_text(h36_nodes, "Array Commands");
    			h36_nodes.forEach(detach_dev);
    			t92 = claim_space(nodes);
    			p16 = claim_element(nodes, "P", {});
    			var p16_nodes = children(p16);
    			t93 = claim_text(p16_nodes, "array commands take array as first argument");
    			p16_nodes.forEach(detach_dev);
    			t94 = claim_space(nodes);
    			table0 = claim_element(nodes, "TABLE", {});
    			var table0_nodes = children(table0);
    			thead0 = claim_element(table0_nodes, "THEAD", {});
    			var thead0_nodes = children(thead0);
    			tr0 = claim_element(thead0_nodes, "TR", {});
    			var tr0_nodes = children(tr0);
    			th0 = claim_element(tr0_nodes, "TH", {});
    			var th0_nodes = children(th0);
    			t95 = claim_text(th0_nodes, "command");
    			th0_nodes.forEach(detach_dev);
    			t96 = claim_space(tr0_nodes);
    			th1 = claim_element(tr0_nodes, "TH", {});
    			var th1_nodes = children(th1);
    			t97 = claim_text(th1_nodes, "definition");
    			th1_nodes.forEach(detach_dev);
    			t98 = claim_space(tr0_nodes);
    			th2 = claim_element(tr0_nodes, "TH", {});
    			var th2_nodes = children(th2);
    			t99 = claim_text(th2_nodes, "args no");
    			th2_nodes.forEach(detach_dev);
    			t100 = claim_space(tr0_nodes);
    			th3 = claim_element(tr0_nodes, "TH", {});
    			var th3_nodes = children(th3);
    			t101 = claim_text(th3_nodes, "js equivalent");
    			th3_nodes.forEach(detach_dev);
    			tr0_nodes.forEach(detach_dev);
    			thead0_nodes.forEach(detach_dev);
    			t102 = claim_space(table0_nodes);
    			tbody0 = claim_element(table0_nodes, "TBODY", {});
    			var tbody0_nodes = children(tbody0);
    			tr1 = claim_element(tbody0_nodes, "TR", {});
    			var tr1_nodes = children(tr1);
    			td0 = claim_element(tr1_nodes, "TD", {});
    			var td0_nodes = children(td0);
    			t103 = claim_text(td0_nodes, "pop");
    			td0_nodes.forEach(detach_dev);
    			t104 = claim_space(tr1_nodes);
    			td1 = claim_element(tr1_nodes, "TD", {});
    			var td1_nodes = children(td1);
    			t105 = claim_text(td1_nodes, "pop last element");
    			td1_nodes.forEach(detach_dev);
    			t106 = claim_space(tr1_nodes);
    			td2 = claim_element(tr1_nodes, "TD", {});
    			var td2_nodes = children(td2);
    			t107 = claim_text(td2_nodes, "1");
    			td2_nodes.forEach(detach_dev);
    			t108 = claim_space(tr1_nodes);
    			td3 = claim_element(tr1_nodes, "TD", {});
    			var td3_nodes = children(td3);
    			t109 = claim_text(td3_nodes, ".pop()");
    			td3_nodes.forEach(detach_dev);
    			tr1_nodes.forEach(detach_dev);
    			t110 = claim_space(tbody0_nodes);
    			tr2 = claim_element(tbody0_nodes, "TR", {});
    			var tr2_nodes = children(tr2);
    			td4 = claim_element(tr2_nodes, "TD", {});
    			var td4_nodes = children(td4);
    			t111 = claim_text(td4_nodes, "shift");
    			td4_nodes.forEach(detach_dev);
    			t112 = claim_space(tr2_nodes);
    			td5 = claim_element(tr2_nodes, "TD", {});
    			var td5_nodes = children(td5);
    			t113 = claim_text(td5_nodes, "pop first element");
    			td5_nodes.forEach(detach_dev);
    			t114 = claim_space(tr2_nodes);
    			td6 = claim_element(tr2_nodes, "TD", {});
    			var td6_nodes = children(td6);
    			t115 = claim_text(td6_nodes, "1");
    			td6_nodes.forEach(detach_dev);
    			t116 = claim_space(tr2_nodes);
    			td7 = claim_element(tr2_nodes, "TD", {});
    			var td7_nodes = children(td7);
    			t117 = claim_text(td7_nodes, ".shift()");
    			td7_nodes.forEach(detach_dev);
    			tr2_nodes.forEach(detach_dev);
    			t118 = claim_space(tbody0_nodes);
    			tr3 = claim_element(tbody0_nodes, "TR", {});
    			var tr3_nodes = children(tr3);
    			td8 = claim_element(tr3_nodes, "TD", {});
    			var td8_nodes = children(td8);
    			t119 = claim_text(td8_nodes, "length");
    			td8_nodes.forEach(detach_dev);
    			t120 = claim_space(tr3_nodes);
    			td9 = claim_element(tr3_nodes, "TD", {});
    			var td9_nodes = children(td9);
    			t121 = claim_text(td9_nodes, "length of array");
    			td9_nodes.forEach(detach_dev);
    			t122 = claim_space(tr3_nodes);
    			td10 = claim_element(tr3_nodes, "TD", {});
    			var td10_nodes = children(td10);
    			t123 = claim_text(td10_nodes, "1");
    			td10_nodes.forEach(detach_dev);
    			t124 = claim_space(tr3_nodes);
    			td11 = claim_element(tr3_nodes, "TD", {});
    			var td11_nodes = children(td11);
    			t125 = claim_text(td11_nodes, ".length");
    			td11_nodes.forEach(detach_dev);
    			tr3_nodes.forEach(detach_dev);
    			t126 = claim_space(tbody0_nodes);
    			tr4 = claim_element(tbody0_nodes, "TR", {});
    			var tr4_nodes = children(tr4);
    			td12 = claim_element(tr4_nodes, "TD", {});
    			var td12_nodes = children(td12);
    			t127 = claim_text(td12_nodes, "reverse");
    			td12_nodes.forEach(detach_dev);
    			t128 = claim_space(tr4_nodes);
    			td13 = claim_element(tr4_nodes, "TD", {});
    			var td13_nodes = children(td13);
    			t129 = claim_text(td13_nodes, "reverse the array");
    			td13_nodes.forEach(detach_dev);
    			t130 = claim_space(tr4_nodes);
    			td14 = claim_element(tr4_nodes, "TD", {});
    			var td14_nodes = children(td14);
    			t131 = claim_text(td14_nodes, "1");
    			td14_nodes.forEach(detach_dev);
    			t132 = claim_space(tr4_nodes);
    			td15 = claim_element(tr4_nodes, "TD", {});
    			var td15_nodes = children(td15);
    			t133 = claim_text(td15_nodes, ".reverse()");
    			td15_nodes.forEach(detach_dev);
    			tr4_nodes.forEach(detach_dev);
    			t134 = claim_space(tbody0_nodes);
    			tr5 = claim_element(tbody0_nodes, "TR", {});
    			var tr5_nodes = children(tr5);
    			td16 = claim_element(tr5_nodes, "TD", {});
    			var td16_nodes = children(td16);
    			t135 = claim_text(td16_nodes, "last");
    			td16_nodes.forEach(detach_dev);
    			t136 = claim_space(tr5_nodes);
    			td17 = claim_element(tr5_nodes, "TD", {});
    			var td17_nodes = children(td17);
    			t137 = claim_text(td17_nodes, "last element of array");
    			td17_nodes.forEach(detach_dev);
    			t138 = claim_space(tr5_nodes);
    			td18 = claim_element(tr5_nodes, "TD", {});
    			var td18_nodes = children(td18);
    			t139 = claim_text(td18_nodes, "1");
    			td18_nodes.forEach(detach_dev);
    			t140 = claim_space(tr5_nodes);
    			td19 = claim_element(tr5_nodes, "TD", {});
    			var td19_nodes = children(td19);
    			t141 = claim_text(td19_nodes, "arr[arr.length-1]");
    			td19_nodes.forEach(detach_dev);
    			tr5_nodes.forEach(detach_dev);
    			t142 = claim_space(tbody0_nodes);
    			tr6 = claim_element(tbody0_nodes, "TR", {});
    			var tr6_nodes = children(tr6);
    			td20 = claim_element(tr6_nodes, "TD", {});
    			var td20_nodes = children(td20);
    			t143 = claim_text(td20_nodes, "push");
    			td20_nodes.forEach(detach_dev);
    			t144 = claim_space(tr6_nodes);
    			td21 = claim_element(tr6_nodes, "TD", {});
    			var td21_nodes = children(td21);
    			t145 = claim_text(td21_nodes, "push $1 to end of array");
    			td21_nodes.forEach(detach_dev);
    			t146 = claim_space(tr6_nodes);
    			td22 = claim_element(tr6_nodes, "TD", {});
    			var td22_nodes = children(td22);
    			t147 = claim_text(td22_nodes, "2");
    			td22_nodes.forEach(detach_dev);
    			t148 = claim_space(tr6_nodes);
    			td23 = claim_element(tr6_nodes, "TD", {});
    			var td23_nodes = children(td23);
    			t149 = claim_text(td23_nodes, ".push()");
    			td23_nodes.forEach(detach_dev);
    			tr6_nodes.forEach(detach_dev);
    			t150 = claim_space(tbody0_nodes);
    			tr7 = claim_element(tbody0_nodes, "TR", {});
    			var tr7_nodes = children(tr7);
    			td24 = claim_element(tr7_nodes, "TD", {});
    			var td24_nodes = children(td24);
    			t151 = claim_text(td24_nodes, "unshift");
    			td24_nodes.forEach(detach_dev);
    			t152 = claim_space(tr7_nodes);
    			td25 = claim_element(tr7_nodes, "TD", {});
    			var td25_nodes = children(td25);
    			t153 = claim_text(td25_nodes, "push $1 to start of array");
    			td25_nodes.forEach(detach_dev);
    			t154 = claim_space(tr7_nodes);
    			td26 = claim_element(tr7_nodes, "TD", {});
    			var td26_nodes = children(td26);
    			t155 = claim_text(td26_nodes, "2");
    			td26_nodes.forEach(detach_dev);
    			t156 = claim_space(tr7_nodes);
    			td27 = claim_element(tr7_nodes, "TD", {});
    			var td27_nodes = children(td27);
    			t157 = claim_text(td27_nodes, ".unshift()");
    			td27_nodes.forEach(detach_dev);
    			tr7_nodes.forEach(detach_dev);
    			t158 = claim_space(tbody0_nodes);
    			tr8 = claim_element(tbody0_nodes, "TR", {});
    			var tr8_nodes = children(tr8);
    			td28 = claim_element(tr8_nodes, "TD", {});
    			var td28_nodes = children(td28);
    			t159 = claim_text(td28_nodes, "includes");
    			td28_nodes.forEach(detach_dev);
    			t160 = claim_space(tr8_nodes);
    			td29 = claim_element(tr8_nodes, "TD", {});
    			var td29_nodes = children(td29);
    			t161 = claim_text(td29_nodes, "check if includes $1");
    			td29_nodes.forEach(detach_dev);
    			t162 = claim_space(tr8_nodes);
    			td30 = claim_element(tr8_nodes, "TD", {});
    			var td30_nodes = children(td30);
    			t163 = claim_text(td30_nodes, "2");
    			td30_nodes.forEach(detach_dev);
    			t164 = claim_space(tr8_nodes);
    			td31 = claim_element(tr8_nodes, "TD", {});
    			var td31_nodes = children(td31);
    			t165 = claim_text(td31_nodes, ".includes()");
    			td31_nodes.forEach(detach_dev);
    			tr8_nodes.forEach(detach_dev);
    			tbody0_nodes.forEach(detach_dev);
    			table0_nodes.forEach(detach_dev);
    			t166 = claim_space(nodes);
    			h26 = claim_element(nodes, "H2", { id: true });
    			var h26_nodes = children(h26);
    			t167 = claim_text(h26_nodes, "Object");
    			h26_nodes.forEach(detach_dev);
    			t168 = claim_space(nodes);
    			p17 = claim_element(nodes, "P", {});
    			var p17_nodes = children(p17);
    			t169 = claim_text(p17_nodes, "use the new command to create a array");
    			p17_nodes.forEach(detach_dev);
    			t170 = claim_space(nodes);
    			pre8 = claim_element(nodes, "PRE", {});
    			var pre8_nodes = children(pre8);
    			code9 = claim_element(pre8_nodes, "CODE", { class: true });
    			var code9_nodes = children(code9);
    			t171 = claim_text(code9_nodes, "set obj | new Object");
    			code9_nodes.forEach(detach_dev);
    			pre8_nodes.forEach(detach_dev);
    			t172 = claim_space(nodes);
    			h37 = claim_element(nodes, "H3", { id: true });
    			var h37_nodes = children(h37);
    			t173 = claim_text(h37_nodes, "Object Commands");
    			h37_nodes.forEach(detach_dev);
    			t174 = claim_space(nodes);
    			table1 = claim_element(nodes, "TABLE", {});
    			var table1_nodes = children(table1);
    			thead1 = claim_element(table1_nodes, "THEAD", {});
    			var thead1_nodes = children(thead1);
    			tr9 = claim_element(thead1_nodes, "TR", {});
    			var tr9_nodes = children(tr9);
    			th4 = claim_element(tr9_nodes, "TH", {});
    			var th4_nodes = children(th4);
    			t175 = claim_text(th4_nodes, "command");
    			th4_nodes.forEach(detach_dev);
    			t176 = claim_space(tr9_nodes);
    			th5 = claim_element(tr9_nodes, "TH", {});
    			var th5_nodes = children(th5);
    			t177 = claim_text(th5_nodes, "definition");
    			th5_nodes.forEach(detach_dev);
    			t178 = claim_space(tr9_nodes);
    			th6 = claim_element(tr9_nodes, "TH", {});
    			var th6_nodes = children(th6);
    			t179 = claim_text(th6_nodes, "args no");
    			th6_nodes.forEach(detach_dev);
    			t180 = claim_space(tr9_nodes);
    			th7 = claim_element(tr9_nodes, "TH", {});
    			var th7_nodes = children(th7);
    			t181 = claim_text(th7_nodes, "js equivalent");
    			th7_nodes.forEach(detach_dev);
    			tr9_nodes.forEach(detach_dev);
    			thead1_nodes.forEach(detach_dev);
    			t182 = claim_space(table1_nodes);
    			tbody1 = claim_element(table1_nodes, "TBODY", {});
    			var tbody1_nodes = children(tbody1);
    			tr10 = claim_element(tbody1_nodes, "TR", {});
    			var tr10_nodes = children(tr10);
    			td32 = claim_element(tr10_nodes, "TD", {});
    			children(td32).forEach(detach_dev);
    			tr10_nodes.forEach(detach_dev);
    			tbody1_nodes.forEach(detach_dev);
    			table1_nodes.forEach(detach_dev);
    			t183 = claim_space(nodes);
    			h27 = claim_element(nodes, "H2", { id: true });
    			var h27_nodes = children(h27);
    			t184 = claim_text(h27_nodes, "String");
    			h27_nodes.forEach(detach_dev);
    			t185 = claim_space(nodes);
    			p18 = claim_element(nodes, "P", {});
    			var p18_nodes = children(p18);
    			t186 = claim_text(p18_nodes, "single quotes ");
    			code10 = claim_element(p18_nodes, "CODE", {});
    			var code10_nodes = children(code10);
    			t187 = claim_text(code10_nodes, "' '");
    			code10_nodes.forEach(detach_dev);
    			t188 = claim_text(p18_nodes, " are used to declare string");
    			p18_nodes.forEach(detach_dev);
    			t189 = claim_space(nodes);
    			pre9 = claim_element(nodes, "PRE", {});
    			var pre9_nodes = children(pre9);
    			code11 = claim_element(pre9_nodes, "CODE", { class: true });
    			var code11_nodes = children(code11);
    			t190 = claim_text(code11_nodes, "log 'this is a string'");
    			code11_nodes.forEach(detach_dev);
    			pre9_nodes.forEach(detach_dev);
    			t191 = claim_space(nodes);
    			h38 = claim_element(nodes, "H3", { id: true });
    			var h38_nodes = children(h38);
    			t192 = claim_text(h38_nodes, "String Commands");
    			h38_nodes.forEach(detach_dev);
    			t193 = claim_space(nodes);
    			table2 = claim_element(nodes, "TABLE", {});
    			var table2_nodes = children(table2);
    			thead2 = claim_element(table2_nodes, "THEAD", {});
    			var thead2_nodes = children(thead2);
    			tr11 = claim_element(thead2_nodes, "TR", {});
    			var tr11_nodes = children(tr11);
    			th8 = claim_element(tr11_nodes, "TH", {});
    			var th8_nodes = children(th8);
    			t194 = claim_text(th8_nodes, "command");
    			th8_nodes.forEach(detach_dev);
    			t195 = claim_space(tr11_nodes);
    			th9 = claim_element(tr11_nodes, "TH", {});
    			var th9_nodes = children(th9);
    			t196 = claim_text(th9_nodes, "definition");
    			th9_nodes.forEach(detach_dev);
    			t197 = claim_space(tr11_nodes);
    			th10 = claim_element(tr11_nodes, "TH", {});
    			var th10_nodes = children(th10);
    			t198 = claim_text(th10_nodes, "args no");
    			th10_nodes.forEach(detach_dev);
    			t199 = claim_space(tr11_nodes);
    			th11 = claim_element(tr11_nodes, "TH", {});
    			var th11_nodes = children(th11);
    			t200 = claim_text(th11_nodes, "js equivalent");
    			th11_nodes.forEach(detach_dev);
    			tr11_nodes.forEach(detach_dev);
    			thead2_nodes.forEach(detach_dev);
    			t201 = claim_space(table2_nodes);
    			tbody2 = claim_element(table2_nodes, "TBODY", {});
    			var tbody2_nodes = children(tbody2);
    			tr12 = claim_element(tbody2_nodes, "TR", {});
    			var tr12_nodes = children(tr12);
    			td33 = claim_element(tr12_nodes, "TD", {});
    			children(td33).forEach(detach_dev);
    			tr12_nodes.forEach(detach_dev);
    			tbody2_nodes.forEach(detach_dev);
    			table2_nodes.forEach(detach_dev);
    			t202 = claim_space(nodes);
    			h14 = claim_element(nodes, "H1", { id: true });
    			var h14_nodes = children(h14);
    			t203 = claim_text(h14_nodes, "Commands");
    			h14_nodes.forEach(detach_dev);
    			t204 = claim_space(nodes);
    			p19 = claim_element(nodes, "P", {});
    			var p19_nodes = children(p19);
    			t205 = claim_text(p19_nodes, "mostly every thing in pipescript is done using commands. command takes arguments and return a output.");
    			p19_nodes.forEach(detach_dev);
    			t206 = claim_space(nodes);
    			h28 = claim_element(nodes, "H2", { id: true });
    			var h28_nodes = children(h28);
    			t207 = claim_text(h28_nodes, "set");
    			h28_nodes.forEach(detach_dev);
    			t208 = claim_space(nodes);
    			p20 = claim_element(nodes, "P", {});
    			var p20_nodes = children(p20);
    			t209 = claim_text(p20_nodes, "used for setting variables");
    			p20_nodes.forEach(detach_dev);
    			t210 = claim_space(nodes);
    			pre10 = claim_element(nodes, "PRE", {});
    			var pre10_nodes = children(pre10);
    			code12 = claim_element(pre10_nodes, "CODE", { class: true });
    			var code12_nodes = children(code12);
    			t211 = claim_text(code12_nodes, "set <name> <value>\n\nset n 100");
    			code12_nodes.forEach(detach_dev);
    			pre10_nodes.forEach(detach_dev);
    			t212 = claim_space(nodes);
    			p21 = claim_element(nodes, "P", {});
    			var p21_nodes = children(p21);
    			strong0 = claim_element(p21_nodes, "STRONG", {});
    			var strong0_nodes = children(strong0);
    			t213 = claim_text(strong0_nodes, "return value");
    			strong0_nodes.forEach(detach_dev);
    			t214 = claim_text(p21_nodes, " : null");
    			br2 = claim_element(p21_nodes, "BR", {});
    			strong1 = claim_element(p21_nodes, "STRONG", {});
    			var strong1_nodes = children(strong1);
    			t215 = claim_text(strong1_nodes, "arguments");
    			strong1_nodes.forEach(detach_dev);
    			t216 = claim_text(p21_nodes, " : var-name, value");
    			p21_nodes.forEach(detach_dev);
    			t217 = claim_space(nodes);
    			h29 = claim_element(nodes, "H2", { id: true });
    			var h29_nodes = children(h29);
    			t218 = claim_text(h29_nodes, "get");
    			h29_nodes.forEach(detach_dev);
    			t219 = claim_space(nodes);
    			p22 = claim_element(nodes, "P", {});
    			var p22_nodes = children(p22);
    			t220 = claim_text(p22_nodes, "get index or key of refrence types");
    			p22_nodes.forEach(detach_dev);
    			t221 = claim_space(nodes);
    			pre11 = claim_element(nodes, "PRE", {});
    			var pre11_nodes = children(pre11);
    			code13 = claim_element(pre11_nodes, "CODE", { class: true });
    			var code13_nodes = children(code13);
    			t222 = claim_text(code13_nodes, "get <refrence-type> <keys/indexs>");
    			code13_nodes.forEach(detach_dev);
    			pre11_nodes.forEach(detach_dev);
    			t223 = claim_space(nodes);
    			p23 = claim_element(nodes, "P", {});
    			var p23_nodes = children(p23);
    			t224 = claim_text(p23_nodes, "example");
    			p23_nodes.forEach(detach_dev);
    			t225 = claim_space(nodes);
    			pre12 = claim_element(nodes, "PRE", {});
    			var pre12_nodes = children(pre12);
    			code14 = claim_element(pre12_nodes, "CODE", { class: true });
    			var code14_nodes = children(code14);
    			t226 = claim_text(code14_nodes, "# pipescript form \n1. get $array 0\n2. get $array 0 10 'key'\n\n# javascript form\n1. array[0]\n2. array[0][10]['key']");
    			code14_nodes.forEach(detach_dev);
    			pre12_nodes.forEach(detach_dev);
    			t227 = claim_space(nodes);
    			p24 = claim_element(nodes, "P", {});
    			var p24_nodes = children(p24);
    			strong2 = claim_element(p24_nodes, "STRONG", {});
    			var strong2_nodes = children(strong2);
    			t228 = claim_text(strong2_nodes, "return value");
    			strong2_nodes.forEach(detach_dev);
    			t229 = claim_text(p24_nodes, " : target value");
    			br3 = claim_element(p24_nodes, "BR", {});
    			strong3 = claim_element(p24_nodes, "STRONG", {});
    			var strong3_nodes = children(strong3);
    			t230 = claim_text(strong3_nodes, "arguments");
    			strong3_nodes.forEach(detach_dev);
    			t231 = claim_text(p24_nodes, " : refrence-type, multiple key/index");
    			p24_nodes.forEach(detach_dev);
    			t232 = claim_space(nodes);
    			h210 = claim_element(nodes, "H2", { id: true });
    			var h210_nodes = children(h210);
    			t233 = claim_text(h210_nodes, "log");
    			h210_nodes.forEach(detach_dev);
    			t234 = claim_space(nodes);
    			p25 = claim_element(nodes, "P", {});
    			var p25_nodes = children(p25);
    			t235 = claim_text(p25_nodes, "log multiple inputs to console");
    			p25_nodes.forEach(detach_dev);
    			t236 = claim_space(nodes);
    			pre13 = claim_element(nodes, "PRE", {});
    			var pre13_nodes = children(pre13);
    			code15 = claim_element(pre13_nodes, "CODE", { class: true });
    			var code15_nodes = children(code15);
    			t237 = claim_text(code15_nodes, "log <input> ...\n\nlog 'this string will get logged'\nlog 100 100 # 100100");
    			code15_nodes.forEach(detach_dev);
    			pre13_nodes.forEach(detach_dev);
    			t238 = claim_space(nodes);
    			p26 = claim_element(nodes, "P", {});
    			var p26_nodes = children(p26);
    			strong4 = claim_element(p26_nodes, "STRONG", {});
    			var strong4_nodes = children(strong4);
    			t239 = claim_text(strong4_nodes, "return value");
    			strong4_nodes.forEach(detach_dev);
    			t240 = claim_text(p26_nodes, " : null");
    			br4 = claim_element(p26_nodes, "BR", {});
    			strong5 = claim_element(p26_nodes, "STRONG", {});
    			var strong5_nodes = children(strong5);
    			t241 = claim_text(strong5_nodes, "arguments");
    			strong5_nodes.forEach(detach_dev);
    			t242 = claim_text(p26_nodes, " : input, input ...");
    			p26_nodes.forEach(detach_dev);
    			t243 = claim_space(nodes);
    			h211 = claim_element(nodes, "H2", { id: true });
    			var h211_nodes = children(h211);
    			t244 = claim_text(h211_nodes, "call");
    			h211_nodes.forEach(detach_dev);
    			t245 = claim_space(nodes);
    			p27 = claim_element(nodes, "P", {});
    			var p27_nodes = children(p27);
    			t246 = claim_text(p27_nodes, "calling a function");
    			p27_nodes.forEach(detach_dev);
    			t247 = claim_space(nodes);
    			pre14 = claim_element(nodes, "PRE", {});
    			var pre14_nodes = children(pre14);
    			code16 = claim_element(pre14_nodes, "CODE", { class: true });
    			var code16_nodes = children(code16);
    			t248 = claim_text(code16_nodes, "call <function_name> <arg>\n\ncall process 10 10\n\nfunction process $a $b\n  return | add $a $b");
    			code16_nodes.forEach(detach_dev);
    			pre14_nodes.forEach(detach_dev);
    			t249 = claim_space(nodes);
    			p28 = claim_element(nodes, "P", {});
    			var p28_nodes = children(p28);
    			strong6 = claim_element(p28_nodes, "STRONG", {});
    			var strong6_nodes = children(strong6);
    			t250 = claim_text(strong6_nodes, "return value");
    			strong6_nodes.forEach(detach_dev);
    			t251 = claim_text(p28_nodes, " : the return value from called function");
    			br5 = claim_element(p28_nodes, "BR", {});
    			strong7 = claim_element(p28_nodes, "STRONG", {});
    			var strong7_nodes = children(strong7);
    			t252 = claim_text(strong7_nodes, "arguments");
    			strong7_nodes.forEach(detach_dev);
    			t253 = claim_text(p28_nodes, " : function-name, args for function");
    			p28_nodes.forEach(detach_dev);
    			t254 = claim_space(nodes);
    			h212 = claim_element(nodes, "H2", { id: true });
    			var h212_nodes = children(h212);
    			t255 = claim_text(h212_nodes, "exit");
    			h212_nodes.forEach(detach_dev);
    			t256 = claim_space(nodes);
    			p29 = claim_element(nodes, "P", {});
    			var p29_nodes = children(p29);
    			t257 = claim_text(p29_nodes, "exit interpreting script");
    			p29_nodes.forEach(detach_dev);
    			t258 = claim_space(nodes);
    			pre15 = claim_element(nodes, "PRE", {});
    			var pre15_nodes = children(pre15);
    			code17 = claim_element(pre15_nodes, "CODE", { class: true });
    			var code17_nodes = children(code17);
    			t259 = claim_text(code17_nodes, "exit");
    			code17_nodes.forEach(detach_dev);
    			pre15_nodes.forEach(detach_dev);
    			t260 = claim_space(nodes);
    			p30 = claim_element(nodes, "P", {});
    			var p30_nodes = children(p30);
    			strong8 = claim_element(p30_nodes, "STRONG", {});
    			var strong8_nodes = children(strong8);
    			t261 = claim_text(strong8_nodes, "return value");
    			strong8_nodes.forEach(detach_dev);
    			t262 = claim_text(p30_nodes, " : null");
    			br6 = claim_element(p30_nodes, "BR", {});
    			strong9 = claim_element(p30_nodes, "STRONG", {});
    			var strong9_nodes = children(strong9);
    			t263 = claim_text(strong9_nodes, "arguments");
    			strong9_nodes.forEach(detach_dev);
    			t264 = claim_text(p30_nodes, " : none");
    			p30_nodes.forEach(detach_dev);
    			t265 = claim_space(nodes);
    			h213 = claim_element(nodes, "H2", { id: true });
    			var h213_nodes = children(h213);
    			t266 = claim_text(h213_nodes, "Arithmetic");
    			h213_nodes.forEach(detach_dev);
    			t267 = claim_space(nodes);
    			p31 = claim_element(nodes, "P", {});
    			var p31_nodes = children(p31);
    			t268 = claim_text(p31_nodes, "Arithmetic commands");
    			p31_nodes.forEach(detach_dev);
    			t269 = claim_space(nodes);
    			h39 = claim_element(nodes, "H3", { id: true });
    			var h39_nodes = children(h39);
    			t270 = claim_text(h39_nodes, "Operators");
    			h39_nodes.forEach(detach_dev);
    			t271 = claim_space(nodes);
    			table3 = claim_element(nodes, "TABLE", {});
    			var table3_nodes = children(table3);
    			thead3 = claim_element(table3_nodes, "THEAD", {});
    			var thead3_nodes = children(thead3);
    			tr13 = claim_element(thead3_nodes, "TR", {});
    			var tr13_nodes = children(tr13);
    			th12 = claim_element(tr13_nodes, "TH", {});
    			var th12_nodes = children(th12);
    			t272 = claim_text(th12_nodes, "command");
    			th12_nodes.forEach(detach_dev);
    			t273 = claim_space(tr13_nodes);
    			th13 = claim_element(tr13_nodes, "TH", {});
    			var th13_nodes = children(th13);
    			t274 = claim_text(th13_nodes, "definition");
    			th13_nodes.forEach(detach_dev);
    			t275 = claim_space(tr13_nodes);
    			th14 = claim_element(tr13_nodes, "TH", {});
    			var th14_nodes = children(th14);
    			t276 = claim_text(th14_nodes, "args no");
    			th14_nodes.forEach(detach_dev);
    			t277 = claim_space(tr13_nodes);
    			th15 = claim_element(tr13_nodes, "TH", {});
    			var th15_nodes = children(th15);
    			t278 = claim_text(th15_nodes, "js equivalent");
    			th15_nodes.forEach(detach_dev);
    			tr13_nodes.forEach(detach_dev);
    			thead3_nodes.forEach(detach_dev);
    			t279 = claim_space(table3_nodes);
    			tbody3 = claim_element(table3_nodes, "TBODY", {});
    			var tbody3_nodes = children(tbody3);
    			tr14 = claim_element(tbody3_nodes, "TR", {});
    			var tr14_nodes = children(tr14);
    			td34 = claim_element(tr14_nodes, "TD", {});
    			var td34_nodes = children(td34);
    			t280 = claim_text(td34_nodes, "add");
    			td34_nodes.forEach(detach_dev);
    			t281 = claim_space(tr14_nodes);
    			td35 = claim_element(tr14_nodes, "TD", {});
    			var td35_nodes = children(td35);
    			t282 = claim_text(td35_nodes, "adds multiple inputs");
    			td35_nodes.forEach(detach_dev);
    			t283 = claim_space(tr14_nodes);
    			td36 = claim_element(tr14_nodes, "TD", {});
    			var td36_nodes = children(td36);
    			t284 = claim_text(td36_nodes, "multiple");
    			td36_nodes.forEach(detach_dev);
    			t285 = claim_space(tr14_nodes);
    			td37 = claim_element(tr14_nodes, "TD", {});
    			var td37_nodes = children(td37);
    			t286 = claim_text(td37_nodes, "+");
    			td37_nodes.forEach(detach_dev);
    			tr14_nodes.forEach(detach_dev);
    			t287 = claim_space(tbody3_nodes);
    			tr15 = claim_element(tbody3_nodes, "TR", {});
    			var tr15_nodes = children(tr15);
    			td38 = claim_element(tr15_nodes, "TD", {});
    			var td38_nodes = children(td38);
    			t288 = claim_text(td38_nodes, "divide");
    			td38_nodes.forEach(detach_dev);
    			t289 = claim_space(tr15_nodes);
    			td39 = claim_element(tr15_nodes, "TD", {});
    			var td39_nodes = children(td39);
    			t290 = claim_text(td39_nodes, "divde multiple inputs");
    			td39_nodes.forEach(detach_dev);
    			t291 = claim_space(tr15_nodes);
    			td40 = claim_element(tr15_nodes, "TD", {});
    			var td40_nodes = children(td40);
    			t292 = claim_text(td40_nodes, "multiple");
    			td40_nodes.forEach(detach_dev);
    			t293 = claim_space(tr15_nodes);
    			td41 = claim_element(tr15_nodes, "TD", {});
    			var td41_nodes = children(td41);
    			t294 = claim_text(td41_nodes, "/");
    			td41_nodes.forEach(detach_dev);
    			tr15_nodes.forEach(detach_dev);
    			t295 = claim_space(tbody3_nodes);
    			tr16 = claim_element(tbody3_nodes, "TR", {});
    			var tr16_nodes = children(tr16);
    			td42 = claim_element(tr16_nodes, "TD", {});
    			var td42_nodes = children(td42);
    			t296 = claim_text(td42_nodes, "multiply");
    			td42_nodes.forEach(detach_dev);
    			t297 = claim_space(tr16_nodes);
    			td43 = claim_element(tr16_nodes, "TD", {});
    			var td43_nodes = children(td43);
    			t298 = claim_text(td43_nodes, "multiply multiple inputs");
    			td43_nodes.forEach(detach_dev);
    			t299 = claim_space(tr16_nodes);
    			td44 = claim_element(tr16_nodes, "TD", {});
    			var td44_nodes = children(td44);
    			t300 = claim_text(td44_nodes, "multiple");
    			td44_nodes.forEach(detach_dev);
    			t301 = claim_space(tr16_nodes);
    			td45 = claim_element(tr16_nodes, "TD", {});
    			var td45_nodes = children(td45);
    			t302 = claim_text(td45_nodes, "*");
    			td45_nodes.forEach(detach_dev);
    			tr16_nodes.forEach(detach_dev);
    			t303 = claim_space(tbody3_nodes);
    			tr17 = claim_element(tbody3_nodes, "TR", {});
    			var tr17_nodes = children(tr17);
    			td46 = claim_element(tr17_nodes, "TD", {});
    			var td46_nodes = children(td46);
    			t304 = claim_text(td46_nodes, "neg");
    			td46_nodes.forEach(detach_dev);
    			t305 = claim_space(tr17_nodes);
    			td47 = claim_element(tr17_nodes, "TD", {});
    			var td47_nodes = children(td47);
    			t306 = claim_text(td47_nodes, "return $1 multiply by -1");
    			td47_nodes.forEach(detach_dev);
    			t307 = claim_space(tr17_nodes);
    			td48 = claim_element(tr17_nodes, "TD", {});
    			var td48_nodes = children(td48);
    			t308 = claim_text(td48_nodes, "1");
    			td48_nodes.forEach(detach_dev);
    			t309 = claim_space(tr17_nodes);
    			td49 = claim_element(tr17_nodes, "TD", {});
    			var td49_nodes = children(td49);
    			t310 = claim_text(td49_nodes, "-1 * input");
    			td49_nodes.forEach(detach_dev);
    			tr17_nodes.forEach(detach_dev);
    			t311 = claim_space(tbody3_nodes);
    			tr18 = claim_element(tbody3_nodes, "TR", {});
    			var tr18_nodes = children(tr18);
    			td50 = claim_element(tr18_nodes, "TD", {});
    			var td50_nodes = children(td50);
    			t312 = claim_text(td50_nodes, "reminder");
    			td50_nodes.forEach(detach_dev);
    			t313 = claim_space(tr18_nodes);
    			td51 = claim_element(tr18_nodes, "TD", {});
    			var td51_nodes = children(td51);
    			t314 = claim_text(td51_nodes, "reminder of first / secound");
    			td51_nodes.forEach(detach_dev);
    			t315 = claim_space(tr18_nodes);
    			td52 = claim_element(tr18_nodes, "TD", {});
    			var td52_nodes = children(td52);
    			t316 = claim_text(td52_nodes, "2");
    			td52_nodes.forEach(detach_dev);
    			t317 = claim_space(tr18_nodes);
    			td53 = claim_element(tr18_nodes, "TD", {});
    			var td53_nodes = children(td53);
    			t318 = claim_text(td53_nodes, "%");
    			td53_nodes.forEach(detach_dev);
    			tr18_nodes.forEach(detach_dev);
    			tbody3_nodes.forEach(detach_dev);
    			table3_nodes.forEach(detach_dev);
    			t319 = claim_space(nodes);
    			h310 = claim_element(nodes, "H3", { id: true });
    			var h310_nodes = children(h310);
    			t320 = claim_text(h310_nodes, "Functions");
    			h310_nodes.forEach(detach_dev);
    			t321 = claim_space(nodes);
    			table4 = claim_element(nodes, "TABLE", {});
    			var table4_nodes = children(table4);
    			thead4 = claim_element(table4_nodes, "THEAD", {});
    			var thead4_nodes = children(thead4);
    			tr19 = claim_element(thead4_nodes, "TR", {});
    			var tr19_nodes = children(tr19);
    			th16 = claim_element(tr19_nodes, "TH", {});
    			var th16_nodes = children(th16);
    			t322 = claim_text(th16_nodes, "command");
    			th16_nodes.forEach(detach_dev);
    			t323 = claim_space(tr19_nodes);
    			th17 = claim_element(tr19_nodes, "TH", {});
    			var th17_nodes = children(th17);
    			t324 = claim_text(th17_nodes, "definition");
    			th17_nodes.forEach(detach_dev);
    			t325 = claim_space(tr19_nodes);
    			th18 = claim_element(tr19_nodes, "TH", {});
    			var th18_nodes = children(th18);
    			t326 = claim_text(th18_nodes, "args no");
    			th18_nodes.forEach(detach_dev);
    			t327 = claim_space(tr19_nodes);
    			th19 = claim_element(tr19_nodes, "TH", {});
    			var th19_nodes = children(th19);
    			t328 = claim_text(th19_nodes, "js equivalent");
    			th19_nodes.forEach(detach_dev);
    			tr19_nodes.forEach(detach_dev);
    			thead4_nodes.forEach(detach_dev);
    			t329 = claim_space(table4_nodes);
    			tbody4 = claim_element(table4_nodes, "TBODY", {});
    			var tbody4_nodes = children(tbody4);
    			tr20 = claim_element(tbody4_nodes, "TR", {});
    			var tr20_nodes = children(tr20);
    			td54 = claim_element(tr20_nodes, "TD", {});
    			var td54_nodes = children(td54);
    			t330 = claim_text(td54_nodes, "floor");
    			td54_nodes.forEach(detach_dev);
    			t331 = claim_space(tr20_nodes);
    			td55 = claim_element(tr20_nodes, "TD", {});
    			var td55_nodes = children(td55);
    			t332 = claim_text(td55_nodes, "floor the number");
    			td55_nodes.forEach(detach_dev);
    			t333 = claim_space(tr20_nodes);
    			td56 = claim_element(tr20_nodes, "TD", {});
    			var td56_nodes = children(td56);
    			t334 = claim_text(td56_nodes, "1");
    			td56_nodes.forEach(detach_dev);
    			t335 = claim_space(tr20_nodes);
    			td57 = claim_element(tr20_nodes, "TD", {});
    			var td57_nodes = children(td57);
    			t336 = claim_text(td57_nodes, "Math.floor()");
    			td57_nodes.forEach(detach_dev);
    			tr20_nodes.forEach(detach_dev);
    			t337 = claim_space(tbody4_nodes);
    			tr21 = claim_element(tbody4_nodes, "TR", {});
    			var tr21_nodes = children(tr21);
    			td58 = claim_element(tr21_nodes, "TD", {});
    			var td58_nodes = children(td58);
    			t338 = claim_text(td58_nodes, "pow");
    			td58_nodes.forEach(detach_dev);
    			t339 = claim_space(tr21_nodes);
    			td59 = claim_element(tr21_nodes, "TD", {});
    			var td59_nodes = children(td59);
    			t340 = claim_text(td59_nodes, "power of $1 raised to $2");
    			td59_nodes.forEach(detach_dev);
    			t341 = claim_space(tr21_nodes);
    			td60 = claim_element(tr21_nodes, "TD", {});
    			var td60_nodes = children(td60);
    			t342 = claim_text(td60_nodes, "2");
    			td60_nodes.forEach(detach_dev);
    			t343 = claim_space(tr21_nodes);
    			td61 = claim_element(tr21_nodes, "TD", {});
    			var td61_nodes = children(td61);
    			t344 = claim_text(td61_nodes, "Math.pow()");
    			td61_nodes.forEach(detach_dev);
    			tr21_nodes.forEach(detach_dev);
    			t345 = claim_space(tbody4_nodes);
    			tr22 = claim_element(tbody4_nodes, "TR", {});
    			var tr22_nodes = children(tr22);
    			td62 = claim_element(tr22_nodes, "TD", {});
    			var td62_nodes = children(td62);
    			t346 = claim_text(td62_nodes, "random");
    			td62_nodes.forEach(detach_dev);
    			t347 = claim_space(tr22_nodes);
    			td63 = claim_element(tr22_nodes, "TD", {});
    			var td63_nodes = children(td63);
    			t348 = claim_text(td63_nodes, "random number between 0 & 1");
    			td63_nodes.forEach(detach_dev);
    			t349 = claim_space(tr22_nodes);
    			td64 = claim_element(tr22_nodes, "TD", {});
    			var td64_nodes = children(td64);
    			t350 = claim_text(td64_nodes, "0");
    			td64_nodes.forEach(detach_dev);
    			t351 = claim_space(tr22_nodes);
    			td65 = claim_element(tr22_nodes, "TD", {});
    			var td65_nodes = children(td65);
    			t352 = claim_text(td65_nodes, "Math.random()");
    			td65_nodes.forEach(detach_dev);
    			tr22_nodes.forEach(detach_dev);
    			t353 = claim_space(tbody4_nodes);
    			tr23 = claim_element(tbody4_nodes, "TR", {});
    			var tr23_nodes = children(tr23);
    			td66 = claim_element(tr23_nodes, "TD", {});
    			var td66_nodes = children(td66);
    			t354 = claim_text(td66_nodes, "round");
    			td66_nodes.forEach(detach_dev);
    			t355 = claim_space(tr23_nodes);
    			td67 = claim_element(tr23_nodes, "TD", {});
    			var td67_nodes = children(td67);
    			t356 = claim_text(td67_nodes, "round the number");
    			td67_nodes.forEach(detach_dev);
    			t357 = claim_space(tr23_nodes);
    			td68 = claim_element(tr23_nodes, "TD", {});
    			var td68_nodes = children(td68);
    			t358 = claim_text(td68_nodes, "1");
    			td68_nodes.forEach(detach_dev);
    			t359 = claim_space(tr23_nodes);
    			td69 = claim_element(tr23_nodes, "TD", {});
    			var td69_nodes = children(td69);
    			t360 = claim_text(td69_nodes, "Math.round()");
    			td69_nodes.forEach(detach_dev);
    			tr23_nodes.forEach(detach_dev);
    			tbody4_nodes.forEach(detach_dev);
    			table4_nodes.forEach(detach_dev);
    			t361 = claim_space(nodes);
    			h214 = claim_element(nodes, "H2", { id: true });
    			var h214_nodes = children(h214);
    			t362 = claim_text(h214_nodes, "Logic Operators");
    			h214_nodes.forEach(detach_dev);
    			t363 = claim_space(nodes);
    			table5 = claim_element(nodes, "TABLE", {});
    			var table5_nodes = children(table5);
    			thead5 = claim_element(table5_nodes, "THEAD", {});
    			var thead5_nodes = children(thead5);
    			tr24 = claim_element(thead5_nodes, "TR", {});
    			var tr24_nodes = children(tr24);
    			th20 = claim_element(tr24_nodes, "TH", {});
    			var th20_nodes = children(th20);
    			t364 = claim_text(th20_nodes, "command");
    			th20_nodes.forEach(detach_dev);
    			t365 = claim_space(tr24_nodes);
    			th21 = claim_element(tr24_nodes, "TH", {});
    			var th21_nodes = children(th21);
    			t366 = claim_text(th21_nodes, "definition");
    			th21_nodes.forEach(detach_dev);
    			t367 = claim_space(tr24_nodes);
    			th22 = claim_element(tr24_nodes, "TH", {});
    			var th22_nodes = children(th22);
    			t368 = claim_text(th22_nodes, "args no");
    			th22_nodes.forEach(detach_dev);
    			t369 = claim_space(tr24_nodes);
    			th23 = claim_element(tr24_nodes, "TH", {});
    			var th23_nodes = children(th23);
    			t370 = claim_text(th23_nodes, "js equivalent");
    			th23_nodes.forEach(detach_dev);
    			tr24_nodes.forEach(detach_dev);
    			thead5_nodes.forEach(detach_dev);
    			t371 = claim_space(table5_nodes);
    			tbody5 = claim_element(table5_nodes, "TBODY", {});
    			var tbody5_nodes = children(tbody5);
    			tr25 = claim_element(tbody5_nodes, "TR", {});
    			var tr25_nodes = children(tr25);
    			td70 = claim_element(tr25_nodes, "TD", {});
    			var td70_nodes = children(td70);
    			t372 = claim_text(td70_nodes, "boolean");
    			td70_nodes.forEach(detach_dev);
    			t373 = claim_space(tr25_nodes);
    			td71 = claim_element(tr25_nodes, "TD", {});
    			var td71_nodes = children(td71);
    			t374 = claim_text(td71_nodes, "change to boolean");
    			td71_nodes.forEach(detach_dev);
    			t375 = claim_space(tr25_nodes);
    			td72 = claim_element(tr25_nodes, "TD", {});
    			var td72_nodes = children(td72);
    			t376 = claim_text(td72_nodes, "1");
    			td72_nodes.forEach(detach_dev);
    			t377 = claim_space(tr25_nodes);
    			td73 = claim_element(tr25_nodes, "TD", {});
    			var td73_nodes = children(td73);
    			t378 = claim_text(td73_nodes, "Boolean()");
    			td73_nodes.forEach(detach_dev);
    			tr25_nodes.forEach(detach_dev);
    			t379 = claim_space(tbody5_nodes);
    			tr26 = claim_element(tbody5_nodes, "TR", {});
    			var tr26_nodes = children(tr26);
    			td74 = claim_element(tr26_nodes, "TD", {});
    			var td74_nodes = children(td74);
    			t380 = claim_text(td74_nodes, "eq");
    			td74_nodes.forEach(detach_dev);
    			t381 = claim_space(tr26_nodes);
    			td75 = claim_element(tr26_nodes, "TD", {});
    			var td75_nodes = children(td75);
    			t382 = claim_text(td75_nodes, "equal to");
    			td75_nodes.forEach(detach_dev);
    			t383 = claim_space(tr26_nodes);
    			td76 = claim_element(tr26_nodes, "TD", {});
    			var td76_nodes = children(td76);
    			t384 = claim_text(td76_nodes, "2");
    			td76_nodes.forEach(detach_dev);
    			t385 = claim_space(tr26_nodes);
    			td77 = claim_element(tr26_nodes, "TD", {});
    			var td77_nodes = children(td77);
    			t386 = claim_text(td77_nodes, "==");
    			td77_nodes.forEach(detach_dev);
    			tr26_nodes.forEach(detach_dev);
    			t387 = claim_space(tbody5_nodes);
    			tr27 = claim_element(tbody5_nodes, "TR", {});
    			var tr27_nodes = children(tr27);
    			td78 = claim_element(tr27_nodes, "TD", {});
    			var td78_nodes = children(td78);
    			t388 = claim_text(td78_nodes, "ge");
    			td78_nodes.forEach(detach_dev);
    			t389 = claim_space(tr27_nodes);
    			td79 = claim_element(tr27_nodes, "TD", {});
    			var td79_nodes = children(td79);
    			t390 = claim_text(td79_nodes, "greater than or equal");
    			td79_nodes.forEach(detach_dev);
    			t391 = claim_space(tr27_nodes);
    			td80 = claim_element(tr27_nodes, "TD", {});
    			var td80_nodes = children(td80);
    			t392 = claim_text(td80_nodes, "2");
    			td80_nodes.forEach(detach_dev);
    			t393 = claim_space(tr27_nodes);
    			td81 = claim_element(tr27_nodes, "TD", {});
    			var td81_nodes = children(td81);
    			t394 = claim_text(td81_nodes, ">=");
    			td81_nodes.forEach(detach_dev);
    			tr27_nodes.forEach(detach_dev);
    			t395 = claim_space(tbody5_nodes);
    			tr28 = claim_element(tbody5_nodes, "TR", {});
    			var tr28_nodes = children(tr28);
    			td82 = claim_element(tr28_nodes, "TD", {});
    			var td82_nodes = children(td82);
    			t396 = claim_text(td82_nodes, "gt");
    			td82_nodes.forEach(detach_dev);
    			t397 = claim_space(tr28_nodes);
    			td83 = claim_element(tr28_nodes, "TD", {});
    			var td83_nodes = children(td83);
    			t398 = claim_text(td83_nodes, "greater than");
    			td83_nodes.forEach(detach_dev);
    			t399 = claim_space(tr28_nodes);
    			td84 = claim_element(tr28_nodes, "TD", {});
    			var td84_nodes = children(td84);
    			t400 = claim_text(td84_nodes, "2");
    			td84_nodes.forEach(detach_dev);
    			t401 = claim_space(tr28_nodes);
    			td85 = claim_element(tr28_nodes, "TD", {});
    			var td85_nodes = children(td85);
    			t402 = claim_text(td85_nodes, ">");
    			td85_nodes.forEach(detach_dev);
    			tr28_nodes.forEach(detach_dev);
    			t403 = claim_space(tbody5_nodes);
    			tr29 = claim_element(tbody5_nodes, "TR", {});
    			var tr29_nodes = children(tr29);
    			td86 = claim_element(tr29_nodes, "TD", {});
    			var td86_nodes = children(td86);
    			t404 = claim_text(td86_nodes, "le");
    			td86_nodes.forEach(detach_dev);
    			t405 = claim_space(tr29_nodes);
    			td87 = claim_element(tr29_nodes, "TD", {});
    			var td87_nodes = children(td87);
    			t406 = claim_text(td87_nodes, "less than or equal");
    			td87_nodes.forEach(detach_dev);
    			t407 = claim_space(tr29_nodes);
    			td88 = claim_element(tr29_nodes, "TD", {});
    			var td88_nodes = children(td88);
    			t408 = claim_text(td88_nodes, "2");
    			td88_nodes.forEach(detach_dev);
    			t409 = claim_space(tr29_nodes);
    			td89 = claim_element(tr29_nodes, "TD", {});
    			var td89_nodes = children(td89);
    			t410 = claim_text(td89_nodes, "<=");
    			td89_nodes.forEach(detach_dev);
    			tr29_nodes.forEach(detach_dev);
    			t411 = claim_space(tbody5_nodes);
    			tr30 = claim_element(tbody5_nodes, "TR", {});
    			var tr30_nodes = children(tr30);
    			td90 = claim_element(tr30_nodes, "TD", {});
    			var td90_nodes = children(td90);
    			t412 = claim_text(td90_nodes, "lt");
    			td90_nodes.forEach(detach_dev);
    			t413 = claim_space(tr30_nodes);
    			td91 = claim_element(tr30_nodes, "TD", {});
    			var td91_nodes = children(td91);
    			t414 = claim_text(td91_nodes, "less than");
    			td91_nodes.forEach(detach_dev);
    			t415 = claim_space(tr30_nodes);
    			td92 = claim_element(tr30_nodes, "TD", {});
    			var td92_nodes = children(td92);
    			t416 = claim_text(td92_nodes, "2");
    			td92_nodes.forEach(detach_dev);
    			t417 = claim_space(tr30_nodes);
    			td93 = claim_element(tr30_nodes, "TD", {});
    			var td93_nodes = children(td93);
    			t418 = claim_text(td93_nodes, "<");
    			td93_nodes.forEach(detach_dev);
    			tr30_nodes.forEach(detach_dev);
    			t419 = claim_space(tbody5_nodes);
    			tr31 = claim_element(tbody5_nodes, "TR", {});
    			var tr31_nodes = children(tr31);
    			td94 = claim_element(tr31_nodes, "TD", {});
    			var td94_nodes = children(td94);
    			t420 = claim_text(td94_nodes, "not");
    			td94_nodes.forEach(detach_dev);
    			t421 = claim_space(tr31_nodes);
    			td95 = claim_element(tr31_nodes, "TD", {});
    			var td95_nodes = children(td95);
    			t422 = claim_text(td95_nodes, "not operator");
    			td95_nodes.forEach(detach_dev);
    			t423 = claim_space(tr31_nodes);
    			td96 = claim_element(tr31_nodes, "TD", {});
    			var td96_nodes = children(td96);
    			t424 = claim_text(td96_nodes, "1");
    			td96_nodes.forEach(detach_dev);
    			t425 = claim_space(tr31_nodes);
    			td97 = claim_element(tr31_nodes, "TD", {});
    			var td97_nodes = children(td97);
    			t426 = claim_text(td97_nodes, "!");
    			td97_nodes.forEach(detach_dev);
    			tr31_nodes.forEach(detach_dev);
    			tbody5_nodes.forEach(detach_dev);
    			table5_nodes.forEach(detach_dev);
    			t427 = claim_space(nodes);
    			h15 = claim_element(nodes, "H1", { id: true });
    			var h15_nodes = children(h15);
    			t428 = claim_text(h15_nodes, "Conditional Flow");
    			h15_nodes.forEach(detach_dev);
    			t429 = claim_space(nodes);
    			p32 = claim_element(nodes, "P", {});
    			var p32_nodes = children(p32);
    			t430 = claim_text(p32_nodes, "\"do this\" or \"do that\" based on some condition.");
    			p32_nodes.forEach(detach_dev);
    			t431 = claim_space(nodes);
    			h215 = claim_element(nodes, "H2", { id: true });
    			var h215_nodes = children(h215);
    			t432 = claim_text(h215_nodes, "If Statements");
    			h215_nodes.forEach(detach_dev);
    			t433 = claim_space(nodes);
    			p33 = claim_element(nodes, "P", {});
    			var p33_nodes = children(p33);
    			t434 = claim_text(p33_nodes, "if statements as usual");
    			p33_nodes.forEach(detach_dev);
    			t435 = claim_space(nodes);
    			pre16 = claim_element(nodes, "PRE", {});
    			var pre16_nodes = children(pre16);
    			code18 = claim_element(pre16_nodes, "CODE", { class: true });
    			var code18_nodes = children(code18);
    			t436 = claim_text(code18_nodes, "if <boolean>\n  # do something\nelseif <boolean>\n  # do something\nelse\n  # do something");
    			code18_nodes.forEach(detach_dev);
    			pre16_nodes.forEach(detach_dev);
    			t437 = claim_space(nodes);
    			p34 = claim_element(nodes, "P", {});
    			var p34_nodes = children(p34);
    			t438 = claim_text(p34_nodes, "learn more about ");
    			a0 = claim_element(p34_nodes, "A", { href: true });
    			var a0_nodes = children(a0);
    			t439 = claim_text(a0_nodes, "Logical Operators");
    			a0_nodes.forEach(detach_dev);
    			p34_nodes.forEach(detach_dev);
    			t440 = claim_space(nodes);
    			p35 = claim_element(nodes, "P", {});
    			var p35_nodes = children(p35);
    			t441 = claim_text(p35_nodes, "example");
    			p35_nodes.forEach(detach_dev);
    			t442 = claim_space(nodes);
    			pre17 = claim_element(nodes, "PRE", {});
    			var pre17_nodes = children(pre17);
    			code19 = claim_element(pre17_nodes, "CODE", { class: true });
    			var code19_nodes = children(code19);
    			t443 = claim_text(code19_nodes, "if | eq $n 0\n  log 'equal to 0'\nelseif | lt $n 0\n  log 'less than 0'\nelse\n  log 'something else'");
    			code19_nodes.forEach(detach_dev);
    			pre17_nodes.forEach(detach_dev);
    			t444 = claim_space(nodes);
    			h216 = claim_element(nodes, "H2", { id: true });
    			var h216_nodes = children(h216);
    			t445 = claim_text(h216_nodes, "Switch Case");
    			h216_nodes.forEach(detach_dev);
    			t446 = claim_space(nodes);
    			p36 = claim_element(nodes, "P", {});
    			var p36_nodes = children(p36);
    			t447 = claim_text(p36_nodes, "switch case as usual.");
    			p36_nodes.forEach(detach_dev);
    			t448 = claim_space(nodes);
    			p37 = claim_element(nodes, "P", {});
    			var p37_nodes = children(p37);
    			t449 = claim_text(p37_nodes, "NOTE");
    			br7 = claim_element(p37_nodes, "BR", {});
    			t450 = claim_text(p37_nodes, "pipescript interpreter support multiple default blocks at diffrent levels but the compiler doesnot. the compiler collects all default blocks and puts all of them in single default block at the end of switch block");
    			p37_nodes.forEach(detach_dev);
    			t451 = claim_space(nodes);
    			pre18 = claim_element(nodes, "PRE", {});
    			var pre18_nodes = children(pre18);
    			code20 = claim_element(pre18_nodes, "CODE", { class: true });
    			var code20_nodes = children(code20);
    			t452 = claim_text(code20_nodes, "switch <input>\n  case <value>\n    # do something\n    # break to stop here\n  case <value>\n    # do something\n    # break to stop here\n  default\n    # do something");
    			code20_nodes.forEach(detach_dev);
    			pre18_nodes.forEach(detach_dev);
    			t453 = claim_space(nodes);
    			p38 = claim_element(nodes, "P", {});
    			var p38_nodes = children(p38);
    			t454 = claim_text(p38_nodes, "learn more about ");
    			a1 = claim_element(p38_nodes, "A", { href: true });
    			var a1_nodes = children(a1);
    			t455 = claim_text(a1_nodes, "Arithmetic commands");
    			a1_nodes.forEach(detach_dev);
    			p38_nodes.forEach(detach_dev);
    			t456 = claim_space(nodes);
    			p39 = claim_element(nodes, "P", {});
    			var p39_nodes = children(p39);
    			t457 = claim_text(p39_nodes, "example");
    			p39_nodes.forEach(detach_dev);
    			t458 = claim_space(nodes);
    			pre19 = claim_element(nodes, "PRE", {});
    			var pre19_nodes = children(pre19);
    			code21 = claim_element(pre19_nodes, "CODE", { class: true });
    			var code21_nodes = children(code21);
    			t459 = claim_text(code21_nodes, "set n 10\n\nswitch $n\n  case 10\n    log 10\n    break\n  case | add 1 1\n    log 1\n  default\n    log 'default'");
    			code21_nodes.forEach(detach_dev);
    			pre19_nodes.forEach(detach_dev);
    			t460 = claim_space(nodes);
    			h16 = claim_element(nodes, "H1", { id: true });
    			var h16_nodes = children(h16);
    			t461 = claim_text(h16_nodes, "Iteration");
    			h16_nodes.forEach(detach_dev);
    			t462 = claim_space(nodes);
    			p40 = claim_element(nodes, "P", {});
    			var p40_nodes = children(p40);
    			t463 = claim_text(p40_nodes, "learn more about ");
    			a2 = claim_element(p40_nodes, "A", { href: true });
    			var a2_nodes = children(a2);
    			t464 = claim_text(a2_nodes, "Logical Operators");
    			a2_nodes.forEach(detach_dev);
    			p40_nodes.forEach(detach_dev);
    			t465 = claim_space(nodes);
    			h217 = claim_element(nodes, "H2", { id: true });
    			var h217_nodes = children(h217);
    			t466 = claim_text(h217_nodes, "While Loop");
    			h217_nodes.forEach(detach_dev);
    			t467 = claim_space(nodes);
    			p41 = claim_element(nodes, "P", {});
    			var p41_nodes = children(p41);
    			t468 = claim_text(p41_nodes, "while loop as usual");
    			p41_nodes.forEach(detach_dev);
    			t469 = claim_space(nodes);
    			pre20 = claim_element(nodes, "PRE", {});
    			var pre20_nodes = children(pre20);
    			code22 = claim_element(pre20_nodes, "CODE", { class: true });
    			var code22_nodes = children(code22);
    			t470 = claim_text(code22_nodes, "while <condition>\n  # do something\n  # break to stop");
    			code22_nodes.forEach(detach_dev);
    			pre20_nodes.forEach(detach_dev);
    			t471 = claim_space(nodes);
    			p42 = claim_element(nodes, "P", {});
    			var p42_nodes = children(p42);
    			t472 = claim_text(p42_nodes, "example");
    			p42_nodes.forEach(detach_dev);
    			t473 = claim_space(nodes);
    			pre21 = claim_element(nodes, "PRE", {});
    			var pre21_nodes = children(pre21);
    			code23 = claim_element(pre21_nodes, "CODE", { class: true });
    			var code23_nodes = children(code23);
    			t474 = claim_text(code23_nodes, "set n 0\n\nwhile | ge 10 $n\n  set n | add $n 1\n  log $n");
    			code23_nodes.forEach(detach_dev);
    			pre21_nodes.forEach(detach_dev);
    			t475 = claim_space(nodes);
    			h218 = claim_element(nodes, "H2", { id: true });
    			var h218_nodes = children(h218);
    			t476 = claim_text(h218_nodes, "Basic Loop");
    			h218_nodes.forEach(detach_dev);
    			t477 = claim_space(nodes);
    			p43 = claim_element(nodes, "P", {});
    			var p43_nodes = children(p43);
    			t478 = claim_text(p43_nodes, "loop for certain times");
    			p43_nodes.forEach(detach_dev);
    			t479 = claim_space(nodes);
    			pre22 = claim_element(nodes, "PRE", {});
    			var pre22_nodes = children(pre22);
    			code24 = claim_element(pre22_nodes, "CODE", { class: true });
    			var code24_nodes = children(code24);
    			t480 = claim_text(code24_nodes, "loop <number>\n  # do something\n  # break to stop");
    			code24_nodes.forEach(detach_dev);
    			pre22_nodes.forEach(detach_dev);
    			t481 = claim_space(nodes);
    			p44 = claim_element(nodes, "P", {});
    			var p44_nodes = children(p44);
    			t482 = claim_text(p44_nodes, "example");
    			p44_nodes.forEach(detach_dev);
    			t483 = claim_space(nodes);
    			pre23 = claim_element(nodes, "PRE", {});
    			var pre23_nodes = children(pre23);
    			code25 = claim_element(pre23_nodes, "CODE", { class: true });
    			var code25_nodes = children(code25);
    			t484 = claim_text(code25_nodes, "loop 10\n  log 'still looping'");
    			code25_nodes.forEach(detach_dev);
    			pre23_nodes.forEach(detach_dev);
    			t485 = claim_space(nodes);
    			h219 = claim_element(nodes, "H2", { id: true });
    			var h219_nodes = children(h219);
    			t486 = claim_text(h219_nodes, "Foreach Loop");
    			h219_nodes.forEach(detach_dev);
    			t487 = claim_space(nodes);
    			p45 = claim_element(nodes, "P", {});
    			var p45_nodes = children(p45);
    			t488 = claim_text(p45_nodes, "loop through items in something iterable ( arrays, objects, string)");
    			p45_nodes.forEach(detach_dev);
    			t489 = claim_space(nodes);
    			pre24 = claim_element(nodes, "PRE", {});
    			var pre24_nodes = children(pre24);
    			code26 = claim_element(pre24_nodes, "CODE", { class: true });
    			var code26_nodes = children(code26);
    			t490 = claim_text(code26_nodes, "foreach <var> <something iterable>\n  # do something\n  # break to stop");
    			code26_nodes.forEach(detach_dev);
    			pre24_nodes.forEach(detach_dev);
    			t491 = claim_space(nodes);
    			p46 = claim_element(nodes, "P", {});
    			var p46_nodes = children(p46);
    			t492 = claim_text(p46_nodes, "example");
    			p46_nodes.forEach(detach_dev);
    			t493 = claim_space(nodes);
    			pre25 = claim_element(nodes, "PRE", {});
    			var pre25_nodes = children(pre25);
    			code27 = claim_element(pre25_nodes, "CODE", { class: true });
    			var code27_nodes = children(code27);
    			t494 = claim_text(code27_nodes, "set array | new Array\n\nforeach $value $array\n  log $value");
    			code27_nodes.forEach(detach_dev);
    			pre25_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(h10, "id", "concepts");
    			add_location(h10, file$3, 1, 0, 1);
    			add_location(p0, file$3, 2, 0, 33);
    			add_location(p1, file$3, 3, 0, 166);
    			attr_dev(h30, "id", "believes");
    			add_location(h30, file$3, 4, 0, 244);
    			add_location(li0, file$3, 6, 0, 281);
    			add_location(li1, file$3, 7, 0, 314);
    			add_location(li2, file$3, 8, 0, 342);
    			add_location(li3, file$3, 9, 0, 387);
    			add_location(ol, file$3, 5, 0, 276);
    			attr_dev(h20, "id", "variables");
    			add_location(h20, file$3, 11, 0, 421);
    			add_location(p2, file$3, 12, 0, 455);
    			attr_dev(code0, "class", "lang-ruby");
    			add_location(code0, file$3, 13, 5, 561);
    			add_location(pre0, file$3, 13, 0, 556);
    			attr_dev(h21, "id", "comments");
    			add_location(h21, file$3, 20, 0, 667);
    			add_location(p3, file$3, 21, 0, 699);
    			attr_dev(code1, "class", "lang-ruby");
    			add_location(code1, file$3, 22, 5, 771);
    			add_location(pre1, file$3, 22, 0, 766);
    			attr_dev(h22, "id", "piping");
    			add_location(h22, file$3, 29, 0, 875);
    			add_location(p4, file$3, 30, 0, 903);
    			attr_dev(code2, "class", "lang-ruby");
    			add_location(code2, file$3, 31, 5, 970);
    			add_location(pre2, file$3, 31, 0, 965);
    			attr_dev(h23, "id", "code-block");
    			add_location(h23, file$3, 42, 0, 1120);
    			add_location(p5, file$3, 43, 0, 1156);
    			attr_dev(code3, "class", "lang-ruby");
    			add_location(code3, file$3, 44, 5, 1198);
    			add_location(pre3, file$3, 44, 0, 1193);
    			attr_dev(h24, "id", "functions");
    			add_location(h24, file$3, 53, 0, 1326);
    			add_location(p6, file$3, 54, 0, 1360);
    			attr_dev(code4, "class", "lang-ruby");
    			add_location(code4, file$3, 55, 5, 1391);
    			add_location(pre4, file$3, 55, 0, 1386);
    			attr_dev(h11, "id", "data-types");
    			add_location(h11, file$3, 61, 0, 1520);
    			attr_dev(h12, "id", "primitive");
    			add_location(h12, file$3, 62, 0, 1556);
    			attr_dev(h31, "id", "number");
    			add_location(h31, file$3, 63, 0, 1590);
    			add_location(p7, file$3, 64, 0, 1618);
    			attr_dev(h32, "id", "word");
    			add_location(h32, file$3, 65, 0, 1659);
    			add_location(p8, file$3, 66, 0, 1683);
    			attr_dev(code5, "class", "lang-ruby");
    			add_location(code5, file$3, 67, 5, 1738);
    			add_location(pre5, file$3, 67, 0, 1733);
    			add_location(br0, file$3, 69, 7, 1792);
    			add_location(p9, file$3, 69, 0, 1785);
    			attr_dev(h33, "id", "boolean");
    			add_location(h33, file$3, 70, 0, 1874);
    			add_location(p10, file$3, 71, 0, 1904);
    			attr_dev(h34, "id", "null");
    			add_location(h34, file$3, 72, 0, 1928);
    			add_location(br1, file$3, 73, 16, 1968);
    			add_location(p11, file$3, 73, 0, 1952);
    			attr_dev(h35, "id", "undefined");
    			add_location(h35, file$3, 74, 0, 2046);
    			add_location(p12, file$3, 75, 0, 2080);
    			attr_dev(h13, "id", "refrence");
    			add_location(h13, file$3, 76, 0, 2107);
    			add_location(p13, file$3, 77, 0, 2139);
    			attr_dev(code6, "class", "lang-ruby");
    			add_location(code6, file$3, 78, 5, 2241);
    			add_location(pre6, file$3, 78, 0, 2236);
    			add_location(code7, file$3, 81, 3, 2328);
    			add_location(p14, file$3, 81, 0, 2325);
    			attr_dev(h25, "id", "array");
    			add_location(h25, file$3, 82, 0, 2380);
    			add_location(p15, file$3, 83, 0, 2406);
    			attr_dev(code8, "class", "lang-ruby");
    			add_location(code8, file$3, 84, 5, 2456);
    			add_location(pre7, file$3, 84, 0, 2451);
    			attr_dev(h36, "id", "array-commands");
    			add_location(h36, file$3, 86, 0, 2514);
    			add_location(p16, file$3, 87, 0, 2558);
    			add_location(th0, file$3, 91, 0, 2630);
    			add_location(th1, file$3, 92, 0, 2647);
    			add_location(th2, file$3, 93, 0, 2667);
    			add_location(th3, file$3, 94, 0, 2684);
    			add_location(tr0, file$3, 90, 0, 2625);
    			add_location(thead0, file$3, 89, 0, 2617);
    			add_location(td0, file$3, 99, 0, 2735);
    			add_location(td1, file$3, 100, 0, 2748);
    			add_location(td2, file$3, 101, 0, 2774);
    			add_location(td3, file$3, 102, 0, 2785);
    			add_location(tr1, file$3, 98, 0, 2730);
    			add_location(td4, file$3, 105, 0, 2812);
    			add_location(td5, file$3, 106, 0, 2827);
    			add_location(td6, file$3, 107, 0, 2854);
    			add_location(td7, file$3, 108, 0, 2865);
    			add_location(tr2, file$3, 104, 0, 2807);
    			add_location(td8, file$3, 111, 0, 2894);
    			add_location(td9, file$3, 112, 0, 2910);
    			add_location(td10, file$3, 113, 0, 2935);
    			add_location(td11, file$3, 114, 0, 2946);
    			add_location(tr3, file$3, 110, 0, 2889);
    			add_location(td12, file$3, 117, 0, 2974);
    			add_location(td13, file$3, 118, 0, 2991);
    			add_location(td14, file$3, 119, 0, 3018);
    			add_location(td15, file$3, 120, 0, 3029);
    			add_location(tr4, file$3, 116, 0, 2969);
    			add_location(td16, file$3, 123, 0, 3060);
    			add_location(td17, file$3, 124, 0, 3074);
    			add_location(td18, file$3, 125, 0, 3105);
    			add_location(td19, file$3, 126, 0, 3116);
    			add_location(tr5, file$3, 122, 0, 3055);
    			add_location(td20, file$3, 129, 0, 3154);
    			add_location(td21, file$3, 130, 0, 3168);
    			add_location(td22, file$3, 131, 0, 3201);
    			add_location(td23, file$3, 132, 0, 3212);
    			add_location(tr6, file$3, 128, 0, 3149);
    			add_location(td24, file$3, 135, 0, 3240);
    			add_location(td25, file$3, 136, 0, 3257);
    			add_location(td26, file$3, 137, 0, 3292);
    			add_location(td27, file$3, 138, 0, 3303);
    			add_location(tr7, file$3, 134, 0, 3235);
    			add_location(td28, file$3, 141, 0, 3334);
    			add_location(td29, file$3, 142, 0, 3352);
    			add_location(td30, file$3, 143, 0, 3382);
    			add_location(td31, file$3, 144, 0, 3393);
    			add_location(tr8, file$3, 140, 0, 3329);
    			add_location(tbody0, file$3, 97, 0, 2722);
    			add_location(table0, file$3, 88, 0, 2609);
    			attr_dev(h26, "id", "object");
    			add_location(h26, file$3, 148, 0, 3438);
    			add_location(p17, file$3, 149, 0, 3466);
    			attr_dev(code9, "class", "lang-ruby");
    			add_location(code9, file$3, 150, 5, 3516);
    			add_location(pre8, file$3, 150, 0, 3511);
    			attr_dev(h37, "id", "object-commands");
    			add_location(h37, file$3, 152, 0, 3575);
    			add_location(th4, file$3, 156, 0, 3642);
    			add_location(th5, file$3, 157, 0, 3659);
    			add_location(th6, file$3, 158, 0, 3679);
    			add_location(th7, file$3, 159, 0, 3696);
    			add_location(tr9, file$3, 155, 0, 3637);
    			add_location(thead1, file$3, 154, 0, 3629);
    			add_location(td32, file$3, 164, 0, 3747);
    			add_location(tr10, file$3, 163, 0, 3742);
    			add_location(tbody1, file$3, 162, 0, 3734);
    			add_location(table1, file$3, 153, 0, 3621);
    			attr_dev(h27, "id", "string");
    			add_location(h27, file$3, 168, 0, 3781);
    			add_location(code10, file$3, 169, 17, 3826);
    			add_location(p18, file$3, 169, 0, 3809);
    			attr_dev(code11, "class", "lang-ruby");
    			add_location(code11, file$3, 170, 5, 3887);
    			add_location(pre9, file$3, 170, 0, 3882);
    			attr_dev(h38, "id", "string-commands");
    			add_location(h38, file$3, 172, 0, 3956);
    			add_location(th8, file$3, 176, 0, 4023);
    			add_location(th9, file$3, 177, 0, 4040);
    			add_location(th10, file$3, 178, 0, 4060);
    			add_location(th11, file$3, 179, 0, 4077);
    			add_location(tr11, file$3, 175, 0, 4018);
    			add_location(thead2, file$3, 174, 0, 4010);
    			add_location(td33, file$3, 184, 0, 4128);
    			add_location(tr12, file$3, 183, 0, 4123);
    			add_location(tbody2, file$3, 182, 0, 4115);
    			add_location(table2, file$3, 173, 0, 4002);
    			attr_dev(h14, "id", "commands");
    			add_location(h14, file$3, 188, 0, 4162);
    			add_location(p19, file$3, 189, 0, 4194);
    			attr_dev(h28, "id", "set");
    			add_location(h28, file$3, 190, 0, 4303);
    			add_location(p20, file$3, 191, 0, 4325);
    			attr_dev(code12, "class", "lang-ruby");
    			add_location(code12, file$3, 192, 5, 4364);
    			add_location(pre10, file$3, 192, 0, 4359);
    			add_location(strong0, file$3, 196, 3, 4447);
    			add_location(br2, file$3, 196, 39, 4483);
    			add_location(strong1, file$3, 196, 43, 4487);
    			add_location(p21, file$3, 196, 0, 4444);
    			attr_dev(h29, "id", "get");
    			add_location(h29, file$3, 197, 0, 4536);
    			add_location(p22, file$3, 198, 0, 4558);
    			attr_dev(code13, "class", "lang-ruby");
    			add_location(code13, file$3, 199, 5, 4605);
    			add_location(pre11, file$3, 199, 0, 4600);
    			add_location(p23, file$3, 201, 0, 4689);
    			attr_dev(code14, "class", "lang-ruby");
    			add_location(code14, file$3, 202, 5, 4709);
    			add_location(pre12, file$3, 202, 0, 4704);
    			add_location(strong2, file$3, 210, 3, 4880);
    			add_location(br3, file$3, 210, 47, 4924);
    			add_location(strong3, file$3, 210, 51, 4928);
    			add_location(p24, file$3, 210, 0, 4877);
    			attr_dev(h210, "id", "log");
    			add_location(h210, file$3, 211, 0, 4995);
    			add_location(p25, file$3, 212, 0, 5017);
    			attr_dev(code15, "class", "lang-ruby");
    			add_location(code15, file$3, 213, 5, 5060);
    			add_location(pre13, file$3, 213, 0, 5055);
    			add_location(strong4, file$3, 218, 3, 5187);
    			add_location(br4, file$3, 218, 39, 5223);
    			add_location(strong5, file$3, 218, 43, 5227);
    			add_location(p26, file$3, 218, 0, 5184);
    			attr_dev(h211, "id", "call");
    			add_location(h211, file$3, 219, 0, 5277);
    			add_location(p27, file$3, 220, 0, 5301);
    			attr_dev(code16, "class", "lang-ruby");
    			add_location(code16, file$3, 221, 5, 5332);
    			add_location(pre14, file$3, 221, 0, 5327);
    			add_location(strong6, file$3, 228, 3, 5477);
    			add_location(br5, file$3, 228, 72, 5546);
    			add_location(strong7, file$3, 228, 76, 5550);
    			add_location(p28, file$3, 228, 0, 5474);
    			attr_dev(h212, "id", "exit");
    			add_location(h212, file$3, 229, 0, 5616);
    			add_location(p29, file$3, 230, 0, 5640);
    			attr_dev(code17, "class", "lang-ruby");
    			add_location(code17, file$3, 231, 5, 5677);
    			add_location(pre15, file$3, 231, 0, 5672);
    			add_location(strong8, file$3, 233, 3, 5723);
    			add_location(br6, file$3, 233, 39, 5759);
    			add_location(strong9, file$3, 233, 43, 5763);
    			add_location(p30, file$3, 233, 0, 5720);
    			attr_dev(h213, "id", "arithmetic");
    			add_location(h213, file$3, 234, 0, 5801);
    			add_location(p31, file$3, 235, 0, 5837);
    			attr_dev(h39, "id", "operators");
    			add_location(h39, file$3, 236, 0, 5864);
    			add_location(th12, file$3, 240, 0, 5919);
    			add_location(th13, file$3, 241, 0, 5936);
    			add_location(th14, file$3, 242, 0, 5956);
    			add_location(th15, file$3, 243, 0, 5973);
    			add_location(tr13, file$3, 239, 0, 5914);
    			add_location(thead3, file$3, 238, 0, 5906);
    			add_location(td34, file$3, 248, 0, 6024);
    			add_location(td35, file$3, 249, 0, 6037);
    			add_location(td36, file$3, 250, 0, 6067);
    			add_location(td37, file$3, 251, 0, 6085);
    			add_location(tr14, file$3, 247, 0, 6019);
    			add_location(td38, file$3, 254, 0, 6107);
    			add_location(td39, file$3, 255, 0, 6123);
    			add_location(td40, file$3, 256, 0, 6154);
    			add_location(td41, file$3, 257, 0, 6172);
    			add_location(tr15, file$3, 253, 0, 6102);
    			add_location(td42, file$3, 260, 0, 6194);
    			add_location(td43, file$3, 261, 0, 6212);
    			add_location(td44, file$3, 262, 0, 6246);
    			add_location(td45, file$3, 263, 0, 6264);
    			add_location(tr16, file$3, 259, 0, 6189);
    			add_location(td46, file$3, 266, 0, 6286);
    			add_location(td47, file$3, 267, 0, 6299);
    			add_location(td48, file$3, 268, 0, 6333);
    			add_location(td49, file$3, 269, 0, 6344);
    			add_location(tr17, file$3, 265, 0, 6281);
    			add_location(td50, file$3, 272, 0, 6375);
    			add_location(td51, file$3, 273, 0, 6393);
    			add_location(td52, file$3, 274, 0, 6430);
    			add_location(td53, file$3, 275, 0, 6441);
    			add_location(tr18, file$3, 271, 0, 6370);
    			add_location(tbody3, file$3, 246, 0, 6011);
    			add_location(table3, file$3, 237, 0, 5898);
    			attr_dev(h310, "id", "functions");
    			add_location(h310, file$3, 279, 0, 6476);
    			add_location(th16, file$3, 283, 0, 6531);
    			add_location(th17, file$3, 284, 0, 6548);
    			add_location(th18, file$3, 285, 0, 6568);
    			add_location(th19, file$3, 286, 0, 6585);
    			add_location(tr19, file$3, 282, 0, 6526);
    			add_location(thead4, file$3, 281, 0, 6518);
    			add_location(td54, file$3, 291, 0, 6636);
    			add_location(td55, file$3, 292, 0, 6651);
    			add_location(td56, file$3, 293, 0, 6677);
    			add_location(td57, file$3, 294, 0, 6688);
    			add_location(tr20, file$3, 290, 0, 6631);
    			add_location(td58, file$3, 297, 0, 6721);
    			add_location(td59, file$3, 298, 0, 6734);
    			add_location(td60, file$3, 299, 0, 6768);
    			add_location(td61, file$3, 300, 0, 6779);
    			add_location(tr21, file$3, 296, 0, 6716);
    			add_location(td62, file$3, 303, 0, 6810);
    			add_location(td63, file$3, 304, 0, 6826);
    			add_location(td64, file$3, 305, 0, 6867);
    			add_location(td65, file$3, 306, 0, 6878);
    			add_location(tr22, file$3, 302, 0, 6805);
    			add_location(td66, file$3, 309, 0, 6912);
    			add_location(td67, file$3, 310, 0, 6927);
    			add_location(td68, file$3, 311, 0, 6953);
    			add_location(td69, file$3, 312, 0, 6964);
    			add_location(tr23, file$3, 308, 0, 6907);
    			add_location(tbody4, file$3, 289, 0, 6623);
    			add_location(table4, file$3, 280, 0, 6510);
    			attr_dev(h214, "id", "logic-operators");
    			add_location(h214, file$3, 316, 0, 7010);
    			add_location(th20, file$3, 320, 0, 7077);
    			add_location(th21, file$3, 321, 0, 7094);
    			add_location(th22, file$3, 322, 0, 7114);
    			add_location(th23, file$3, 323, 0, 7131);
    			add_location(tr24, file$3, 319, 0, 7072);
    			add_location(thead5, file$3, 318, 0, 7064);
    			add_location(td70, file$3, 328, 0, 7182);
    			add_location(td71, file$3, 329, 0, 7199);
    			add_location(td72, file$3, 330, 0, 7226);
    			add_location(td73, file$3, 331, 0, 7237);
    			add_location(tr25, file$3, 327, 0, 7177);
    			add_location(td74, file$3, 334, 0, 7267);
    			add_location(td75, file$3, 335, 0, 7279);
    			add_location(td76, file$3, 336, 0, 7297);
    			add_location(td77, file$3, 337, 0, 7308);
    			add_location(tr26, file$3, 333, 0, 7262);
    			add_location(td78, file$3, 340, 0, 7331);
    			add_location(td79, file$3, 341, 0, 7343);
    			add_location(td80, file$3, 342, 0, 7374);
    			add_location(td81, file$3, 343, 0, 7385);
    			add_location(tr27, file$3, 339, 0, 7326);
    			add_location(td82, file$3, 346, 0, 7411);
    			add_location(td83, file$3, 347, 0, 7423);
    			add_location(td84, file$3, 348, 0, 7445);
    			add_location(td85, file$3, 349, 0, 7456);
    			add_location(tr28, file$3, 345, 0, 7406);
    			add_location(td86, file$3, 352, 0, 7481);
    			add_location(td87, file$3, 353, 0, 7493);
    			add_location(td88, file$3, 354, 0, 7521);
    			add_location(td89, file$3, 355, 0, 7532);
    			add_location(tr29, file$3, 351, 0, 7476);
    			add_location(td90, file$3, 358, 0, 7558);
    			add_location(td91, file$3, 359, 0, 7570);
    			add_location(td92, file$3, 360, 0, 7589);
    			add_location(td93, file$3, 361, 0, 7600);
    			add_location(tr30, file$3, 357, 0, 7553);
    			add_location(td94, file$3, 364, 0, 7625);
    			add_location(td95, file$3, 365, 0, 7638);
    			add_location(td96, file$3, 366, 0, 7660);
    			add_location(td97, file$3, 367, 0, 7671);
    			add_location(tr31, file$3, 363, 0, 7620);
    			add_location(tbody5, file$3, 326, 0, 7169);
    			add_location(table5, file$3, 317, 0, 7056);
    			attr_dev(h15, "id", "conditional-flow");
    			add_location(h15, file$3, 371, 0, 7706);
    			add_location(p32, file$3, 372, 0, 7754);
    			attr_dev(h215, "id", "if-statements");
    			add_location(h215, file$3, 373, 0, 7829);
    			add_location(p33, file$3, 374, 0, 7871);
    			attr_dev(code18, "class", "lang-ruby");
    			add_location(code18, file$3, 375, 5, 7906);
    			add_location(pre16, file$3, 375, 0, 7901);
    			attr_dev(a0, "href", "#logic-operators");
    			add_location(a0, file$3, 382, 20, 8062);
    			add_location(p34, file$3, 382, 0, 8042);
    			add_location(p35, file$3, 383, 0, 8115);
    			attr_dev(code19, "class", "lang-ruby");
    			add_location(code19, file$3, 384, 5, 8135);
    			add_location(pre17, file$3, 384, 0, 8130);
    			attr_dev(h216, "id", "switch-case");
    			add_location(h216, file$3, 391, 0, 8294);
    			add_location(p36, file$3, 392, 0, 8332);
    			add_location(br7, file$3, 393, 7, 8368);
    			add_location(p37, file$3, 393, 0, 8361);
    			attr_dev(code20, "class", "lang-ruby");
    			add_location(code20, file$3, 394, 5, 8594);
    			add_location(pre18, file$3, 394, 0, 8589);
    			attr_dev(a1, "href", "#arithmetic");
    			add_location(a1, file$3, 404, 20, 8832);
    			add_location(p38, file$3, 404, 0, 8812);
    			add_location(p39, file$3, 405, 0, 8882);
    			attr_dev(code21, "class", "lang-ruby");
    			add_location(code21, file$3, 406, 5, 8902);
    			add_location(pre19, file$3, 406, 0, 8897);
    			attr_dev(h16, "id", "iteration");
    			add_location(h16, file$3, 417, 0, 9054);
    			attr_dev(a2, "href", "#logic-operators");
    			add_location(a2, file$3, 418, 20, 9108);
    			add_location(p40, file$3, 418, 0, 9088);
    			attr_dev(h217, "id", "while-loop");
    			add_location(h217, file$3, 419, 0, 9161);
    			add_location(p41, file$3, 420, 0, 9197);
    			attr_dev(code22, "class", "lang-ruby");
    			add_location(code22, file$3, 421, 5, 9229);
    			add_location(pre20, file$3, 421, 0, 9224);
    			add_location(p42, file$3, 425, 0, 9326);
    			attr_dev(code23, "class", "lang-ruby");
    			add_location(code23, file$3, 426, 5, 9346);
    			add_location(pre21, file$3, 426, 0, 9341);
    			attr_dev(h218, "id", "basic-loop");
    			add_location(h218, file$3, 432, 0, 9438);
    			add_location(p43, file$3, 433, 0, 9474);
    			attr_dev(code24, "class", "lang-ruby");
    			add_location(code24, file$3, 434, 5, 9509);
    			add_location(pre22, file$3, 434, 0, 9504);
    			add_location(p44, file$3, 438, 0, 9602);
    			attr_dev(code25, "class", "lang-ruby");
    			add_location(code25, file$3, 439, 5, 9622);
    			add_location(pre23, file$3, 439, 0, 9617);
    			attr_dev(h219, "id", "foreach-loop");
    			add_location(h219, file$3, 442, 0, 9698);
    			add_location(p45, file$3, 443, 0, 9738);
    			attr_dev(code26, "class", "lang-ruby");
    			add_location(code26, file$3, 444, 5, 9818);
    			add_location(pre24, file$3, 444, 0, 9813);
    			add_location(p46, file$3, 448, 0, 9938);
    			attr_dev(code27, "class", "lang-ruby");
    			add_location(code27, file$3, 449, 5, 9958);
    			add_location(pre25, file$3, 449, 0, 9953);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, h10, anchor);
    			append_hydration_dev(h10, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, p0, anchor);
    			append_hydration_dev(p0, t2);
    			insert_hydration_dev(target, t3, anchor);
    			insert_hydration_dev(target, p1, anchor);
    			append_hydration_dev(p1, t4);
    			insert_hydration_dev(target, t5, anchor);
    			insert_hydration_dev(target, h30, anchor);
    			append_hydration_dev(h30, t6);
    			insert_hydration_dev(target, t7, anchor);
    			insert_hydration_dev(target, ol, anchor);
    			append_hydration_dev(ol, li0);
    			append_hydration_dev(li0, t8);
    			append_hydration_dev(ol, t9);
    			append_hydration_dev(ol, li1);
    			append_hydration_dev(li1, t10);
    			append_hydration_dev(ol, t11);
    			append_hydration_dev(ol, li2);
    			append_hydration_dev(li2, t12);
    			append_hydration_dev(ol, t13);
    			append_hydration_dev(ol, li3);
    			append_hydration_dev(li3, t14);
    			insert_hydration_dev(target, t15, anchor);
    			insert_hydration_dev(target, h20, anchor);
    			append_hydration_dev(h20, t16);
    			insert_hydration_dev(target, t17, anchor);
    			insert_hydration_dev(target, p2, anchor);
    			append_hydration_dev(p2, t18);
    			insert_hydration_dev(target, t19, anchor);
    			insert_hydration_dev(target, pre0, anchor);
    			append_hydration_dev(pre0, code0);
    			append_hydration_dev(code0, t20);
    			insert_hydration_dev(target, t21, anchor);
    			insert_hydration_dev(target, h21, anchor);
    			append_hydration_dev(h21, t22);
    			insert_hydration_dev(target, t23, anchor);
    			insert_hydration_dev(target, p3, anchor);
    			append_hydration_dev(p3, t24);
    			insert_hydration_dev(target, t25, anchor);
    			insert_hydration_dev(target, pre1, anchor);
    			append_hydration_dev(pre1, code1);
    			append_hydration_dev(code1, t26);
    			insert_hydration_dev(target, t27, anchor);
    			insert_hydration_dev(target, h22, anchor);
    			append_hydration_dev(h22, t28);
    			insert_hydration_dev(target, t29, anchor);
    			insert_hydration_dev(target, p4, anchor);
    			append_hydration_dev(p4, t30);
    			insert_hydration_dev(target, t31, anchor);
    			insert_hydration_dev(target, pre2, anchor);
    			append_hydration_dev(pre2, code2);
    			append_hydration_dev(code2, t32);
    			insert_hydration_dev(target, t33, anchor);
    			insert_hydration_dev(target, h23, anchor);
    			append_hydration_dev(h23, t34);
    			insert_hydration_dev(target, t35, anchor);
    			insert_hydration_dev(target, p5, anchor);
    			append_hydration_dev(p5, t36);
    			insert_hydration_dev(target, t37, anchor);
    			insert_hydration_dev(target, pre3, anchor);
    			append_hydration_dev(pre3, code3);
    			append_hydration_dev(code3, t38);
    			insert_hydration_dev(target, t39, anchor);
    			insert_hydration_dev(target, h24, anchor);
    			append_hydration_dev(h24, t40);
    			insert_hydration_dev(target, t41, anchor);
    			insert_hydration_dev(target, p6, anchor);
    			append_hydration_dev(p6, t42);
    			insert_hydration_dev(target, t43, anchor);
    			insert_hydration_dev(target, pre4, anchor);
    			append_hydration_dev(pre4, code4);
    			append_hydration_dev(code4, t44);
    			insert_hydration_dev(target, t45, anchor);
    			insert_hydration_dev(target, h11, anchor);
    			append_hydration_dev(h11, t46);
    			insert_hydration_dev(target, t47, anchor);
    			insert_hydration_dev(target, h12, anchor);
    			append_hydration_dev(h12, t48);
    			insert_hydration_dev(target, t49, anchor);
    			insert_hydration_dev(target, h31, anchor);
    			append_hydration_dev(h31, t50);
    			insert_hydration_dev(target, t51, anchor);
    			insert_hydration_dev(target, p7, anchor);
    			append_hydration_dev(p7, t52);
    			insert_hydration_dev(target, t53, anchor);
    			insert_hydration_dev(target, h32, anchor);
    			append_hydration_dev(h32, t54);
    			insert_hydration_dev(target, t55, anchor);
    			insert_hydration_dev(target, p8, anchor);
    			append_hydration_dev(p8, t56);
    			insert_hydration_dev(target, t57, anchor);
    			insert_hydration_dev(target, pre5, anchor);
    			append_hydration_dev(pre5, code5);
    			append_hydration_dev(code5, t58);
    			insert_hydration_dev(target, t59, anchor);
    			insert_hydration_dev(target, p9, anchor);
    			append_hydration_dev(p9, t60);
    			append_hydration_dev(p9, br0);
    			append_hydration_dev(p9, t61);
    			insert_hydration_dev(target, t62, anchor);
    			insert_hydration_dev(target, h33, anchor);
    			append_hydration_dev(h33, t63);
    			insert_hydration_dev(target, t64, anchor);
    			insert_hydration_dev(target, p10, anchor);
    			append_hydration_dev(p10, t65);
    			insert_hydration_dev(target, t66, anchor);
    			insert_hydration_dev(target, h34, anchor);
    			append_hydration_dev(h34, t67);
    			insert_hydration_dev(target, t68, anchor);
    			insert_hydration_dev(target, p11, anchor);
    			append_hydration_dev(p11, t69);
    			append_hydration_dev(p11, br1);
    			append_hydration_dev(p11, t70);
    			insert_hydration_dev(target, t71, anchor);
    			insert_hydration_dev(target, h35, anchor);
    			append_hydration_dev(h35, t72);
    			insert_hydration_dev(target, t73, anchor);
    			insert_hydration_dev(target, p12, anchor);
    			append_hydration_dev(p12, t74);
    			insert_hydration_dev(target, t75, anchor);
    			insert_hydration_dev(target, h13, anchor);
    			append_hydration_dev(h13, t76);
    			insert_hydration_dev(target, t77, anchor);
    			insert_hydration_dev(target, p13, anchor);
    			append_hydration_dev(p13, t78);
    			insert_hydration_dev(target, t79, anchor);
    			insert_hydration_dev(target, pre6, anchor);
    			append_hydration_dev(pre6, code6);
    			append_hydration_dev(code6, t80);
    			insert_hydration_dev(target, t81, anchor);
    			insert_hydration_dev(target, p14, anchor);
    			append_hydration_dev(p14, code7);
    			append_hydration_dev(code7, t82);
    			append_hydration_dev(p14, t83);
    			insert_hydration_dev(target, t84, anchor);
    			insert_hydration_dev(target, h25, anchor);
    			append_hydration_dev(h25, t85);
    			insert_hydration_dev(target, t86, anchor);
    			insert_hydration_dev(target, p15, anchor);
    			append_hydration_dev(p15, t87);
    			insert_hydration_dev(target, t88, anchor);
    			insert_hydration_dev(target, pre7, anchor);
    			append_hydration_dev(pre7, code8);
    			append_hydration_dev(code8, t89);
    			insert_hydration_dev(target, t90, anchor);
    			insert_hydration_dev(target, h36, anchor);
    			append_hydration_dev(h36, t91);
    			insert_hydration_dev(target, t92, anchor);
    			insert_hydration_dev(target, p16, anchor);
    			append_hydration_dev(p16, t93);
    			insert_hydration_dev(target, t94, anchor);
    			insert_hydration_dev(target, table0, anchor);
    			append_hydration_dev(table0, thead0);
    			append_hydration_dev(thead0, tr0);
    			append_hydration_dev(tr0, th0);
    			append_hydration_dev(th0, t95);
    			append_hydration_dev(tr0, t96);
    			append_hydration_dev(tr0, th1);
    			append_hydration_dev(th1, t97);
    			append_hydration_dev(tr0, t98);
    			append_hydration_dev(tr0, th2);
    			append_hydration_dev(th2, t99);
    			append_hydration_dev(tr0, t100);
    			append_hydration_dev(tr0, th3);
    			append_hydration_dev(th3, t101);
    			append_hydration_dev(table0, t102);
    			append_hydration_dev(table0, tbody0);
    			append_hydration_dev(tbody0, tr1);
    			append_hydration_dev(tr1, td0);
    			append_hydration_dev(td0, t103);
    			append_hydration_dev(tr1, t104);
    			append_hydration_dev(tr1, td1);
    			append_hydration_dev(td1, t105);
    			append_hydration_dev(tr1, t106);
    			append_hydration_dev(tr1, td2);
    			append_hydration_dev(td2, t107);
    			append_hydration_dev(tr1, t108);
    			append_hydration_dev(tr1, td3);
    			append_hydration_dev(td3, t109);
    			append_hydration_dev(tbody0, t110);
    			append_hydration_dev(tbody0, tr2);
    			append_hydration_dev(tr2, td4);
    			append_hydration_dev(td4, t111);
    			append_hydration_dev(tr2, t112);
    			append_hydration_dev(tr2, td5);
    			append_hydration_dev(td5, t113);
    			append_hydration_dev(tr2, t114);
    			append_hydration_dev(tr2, td6);
    			append_hydration_dev(td6, t115);
    			append_hydration_dev(tr2, t116);
    			append_hydration_dev(tr2, td7);
    			append_hydration_dev(td7, t117);
    			append_hydration_dev(tbody0, t118);
    			append_hydration_dev(tbody0, tr3);
    			append_hydration_dev(tr3, td8);
    			append_hydration_dev(td8, t119);
    			append_hydration_dev(tr3, t120);
    			append_hydration_dev(tr3, td9);
    			append_hydration_dev(td9, t121);
    			append_hydration_dev(tr3, t122);
    			append_hydration_dev(tr3, td10);
    			append_hydration_dev(td10, t123);
    			append_hydration_dev(tr3, t124);
    			append_hydration_dev(tr3, td11);
    			append_hydration_dev(td11, t125);
    			append_hydration_dev(tbody0, t126);
    			append_hydration_dev(tbody0, tr4);
    			append_hydration_dev(tr4, td12);
    			append_hydration_dev(td12, t127);
    			append_hydration_dev(tr4, t128);
    			append_hydration_dev(tr4, td13);
    			append_hydration_dev(td13, t129);
    			append_hydration_dev(tr4, t130);
    			append_hydration_dev(tr4, td14);
    			append_hydration_dev(td14, t131);
    			append_hydration_dev(tr4, t132);
    			append_hydration_dev(tr4, td15);
    			append_hydration_dev(td15, t133);
    			append_hydration_dev(tbody0, t134);
    			append_hydration_dev(tbody0, tr5);
    			append_hydration_dev(tr5, td16);
    			append_hydration_dev(td16, t135);
    			append_hydration_dev(tr5, t136);
    			append_hydration_dev(tr5, td17);
    			append_hydration_dev(td17, t137);
    			append_hydration_dev(tr5, t138);
    			append_hydration_dev(tr5, td18);
    			append_hydration_dev(td18, t139);
    			append_hydration_dev(tr5, t140);
    			append_hydration_dev(tr5, td19);
    			append_hydration_dev(td19, t141);
    			append_hydration_dev(tbody0, t142);
    			append_hydration_dev(tbody0, tr6);
    			append_hydration_dev(tr6, td20);
    			append_hydration_dev(td20, t143);
    			append_hydration_dev(tr6, t144);
    			append_hydration_dev(tr6, td21);
    			append_hydration_dev(td21, t145);
    			append_hydration_dev(tr6, t146);
    			append_hydration_dev(tr6, td22);
    			append_hydration_dev(td22, t147);
    			append_hydration_dev(tr6, t148);
    			append_hydration_dev(tr6, td23);
    			append_hydration_dev(td23, t149);
    			append_hydration_dev(tbody0, t150);
    			append_hydration_dev(tbody0, tr7);
    			append_hydration_dev(tr7, td24);
    			append_hydration_dev(td24, t151);
    			append_hydration_dev(tr7, t152);
    			append_hydration_dev(tr7, td25);
    			append_hydration_dev(td25, t153);
    			append_hydration_dev(tr7, t154);
    			append_hydration_dev(tr7, td26);
    			append_hydration_dev(td26, t155);
    			append_hydration_dev(tr7, t156);
    			append_hydration_dev(tr7, td27);
    			append_hydration_dev(td27, t157);
    			append_hydration_dev(tbody0, t158);
    			append_hydration_dev(tbody0, tr8);
    			append_hydration_dev(tr8, td28);
    			append_hydration_dev(td28, t159);
    			append_hydration_dev(tr8, t160);
    			append_hydration_dev(tr8, td29);
    			append_hydration_dev(td29, t161);
    			append_hydration_dev(tr8, t162);
    			append_hydration_dev(tr8, td30);
    			append_hydration_dev(td30, t163);
    			append_hydration_dev(tr8, t164);
    			append_hydration_dev(tr8, td31);
    			append_hydration_dev(td31, t165);
    			insert_hydration_dev(target, t166, anchor);
    			insert_hydration_dev(target, h26, anchor);
    			append_hydration_dev(h26, t167);
    			insert_hydration_dev(target, t168, anchor);
    			insert_hydration_dev(target, p17, anchor);
    			append_hydration_dev(p17, t169);
    			insert_hydration_dev(target, t170, anchor);
    			insert_hydration_dev(target, pre8, anchor);
    			append_hydration_dev(pre8, code9);
    			append_hydration_dev(code9, t171);
    			insert_hydration_dev(target, t172, anchor);
    			insert_hydration_dev(target, h37, anchor);
    			append_hydration_dev(h37, t173);
    			insert_hydration_dev(target, t174, anchor);
    			insert_hydration_dev(target, table1, anchor);
    			append_hydration_dev(table1, thead1);
    			append_hydration_dev(thead1, tr9);
    			append_hydration_dev(tr9, th4);
    			append_hydration_dev(th4, t175);
    			append_hydration_dev(tr9, t176);
    			append_hydration_dev(tr9, th5);
    			append_hydration_dev(th5, t177);
    			append_hydration_dev(tr9, t178);
    			append_hydration_dev(tr9, th6);
    			append_hydration_dev(th6, t179);
    			append_hydration_dev(tr9, t180);
    			append_hydration_dev(tr9, th7);
    			append_hydration_dev(th7, t181);
    			append_hydration_dev(table1, t182);
    			append_hydration_dev(table1, tbody1);
    			append_hydration_dev(tbody1, tr10);
    			append_hydration_dev(tr10, td32);
    			insert_hydration_dev(target, t183, anchor);
    			insert_hydration_dev(target, h27, anchor);
    			append_hydration_dev(h27, t184);
    			insert_hydration_dev(target, t185, anchor);
    			insert_hydration_dev(target, p18, anchor);
    			append_hydration_dev(p18, t186);
    			append_hydration_dev(p18, code10);
    			append_hydration_dev(code10, t187);
    			append_hydration_dev(p18, t188);
    			insert_hydration_dev(target, t189, anchor);
    			insert_hydration_dev(target, pre9, anchor);
    			append_hydration_dev(pre9, code11);
    			append_hydration_dev(code11, t190);
    			insert_hydration_dev(target, t191, anchor);
    			insert_hydration_dev(target, h38, anchor);
    			append_hydration_dev(h38, t192);
    			insert_hydration_dev(target, t193, anchor);
    			insert_hydration_dev(target, table2, anchor);
    			append_hydration_dev(table2, thead2);
    			append_hydration_dev(thead2, tr11);
    			append_hydration_dev(tr11, th8);
    			append_hydration_dev(th8, t194);
    			append_hydration_dev(tr11, t195);
    			append_hydration_dev(tr11, th9);
    			append_hydration_dev(th9, t196);
    			append_hydration_dev(tr11, t197);
    			append_hydration_dev(tr11, th10);
    			append_hydration_dev(th10, t198);
    			append_hydration_dev(tr11, t199);
    			append_hydration_dev(tr11, th11);
    			append_hydration_dev(th11, t200);
    			append_hydration_dev(table2, t201);
    			append_hydration_dev(table2, tbody2);
    			append_hydration_dev(tbody2, tr12);
    			append_hydration_dev(tr12, td33);
    			insert_hydration_dev(target, t202, anchor);
    			insert_hydration_dev(target, h14, anchor);
    			append_hydration_dev(h14, t203);
    			insert_hydration_dev(target, t204, anchor);
    			insert_hydration_dev(target, p19, anchor);
    			append_hydration_dev(p19, t205);
    			insert_hydration_dev(target, t206, anchor);
    			insert_hydration_dev(target, h28, anchor);
    			append_hydration_dev(h28, t207);
    			insert_hydration_dev(target, t208, anchor);
    			insert_hydration_dev(target, p20, anchor);
    			append_hydration_dev(p20, t209);
    			insert_hydration_dev(target, t210, anchor);
    			insert_hydration_dev(target, pre10, anchor);
    			append_hydration_dev(pre10, code12);
    			append_hydration_dev(code12, t211);
    			insert_hydration_dev(target, t212, anchor);
    			insert_hydration_dev(target, p21, anchor);
    			append_hydration_dev(p21, strong0);
    			append_hydration_dev(strong0, t213);
    			append_hydration_dev(p21, t214);
    			append_hydration_dev(p21, br2);
    			append_hydration_dev(p21, strong1);
    			append_hydration_dev(strong1, t215);
    			append_hydration_dev(p21, t216);
    			insert_hydration_dev(target, t217, anchor);
    			insert_hydration_dev(target, h29, anchor);
    			append_hydration_dev(h29, t218);
    			insert_hydration_dev(target, t219, anchor);
    			insert_hydration_dev(target, p22, anchor);
    			append_hydration_dev(p22, t220);
    			insert_hydration_dev(target, t221, anchor);
    			insert_hydration_dev(target, pre11, anchor);
    			append_hydration_dev(pre11, code13);
    			append_hydration_dev(code13, t222);
    			insert_hydration_dev(target, t223, anchor);
    			insert_hydration_dev(target, p23, anchor);
    			append_hydration_dev(p23, t224);
    			insert_hydration_dev(target, t225, anchor);
    			insert_hydration_dev(target, pre12, anchor);
    			append_hydration_dev(pre12, code14);
    			append_hydration_dev(code14, t226);
    			insert_hydration_dev(target, t227, anchor);
    			insert_hydration_dev(target, p24, anchor);
    			append_hydration_dev(p24, strong2);
    			append_hydration_dev(strong2, t228);
    			append_hydration_dev(p24, t229);
    			append_hydration_dev(p24, br3);
    			append_hydration_dev(p24, strong3);
    			append_hydration_dev(strong3, t230);
    			append_hydration_dev(p24, t231);
    			insert_hydration_dev(target, t232, anchor);
    			insert_hydration_dev(target, h210, anchor);
    			append_hydration_dev(h210, t233);
    			insert_hydration_dev(target, t234, anchor);
    			insert_hydration_dev(target, p25, anchor);
    			append_hydration_dev(p25, t235);
    			insert_hydration_dev(target, t236, anchor);
    			insert_hydration_dev(target, pre13, anchor);
    			append_hydration_dev(pre13, code15);
    			append_hydration_dev(code15, t237);
    			insert_hydration_dev(target, t238, anchor);
    			insert_hydration_dev(target, p26, anchor);
    			append_hydration_dev(p26, strong4);
    			append_hydration_dev(strong4, t239);
    			append_hydration_dev(p26, t240);
    			append_hydration_dev(p26, br4);
    			append_hydration_dev(p26, strong5);
    			append_hydration_dev(strong5, t241);
    			append_hydration_dev(p26, t242);
    			insert_hydration_dev(target, t243, anchor);
    			insert_hydration_dev(target, h211, anchor);
    			append_hydration_dev(h211, t244);
    			insert_hydration_dev(target, t245, anchor);
    			insert_hydration_dev(target, p27, anchor);
    			append_hydration_dev(p27, t246);
    			insert_hydration_dev(target, t247, anchor);
    			insert_hydration_dev(target, pre14, anchor);
    			append_hydration_dev(pre14, code16);
    			append_hydration_dev(code16, t248);
    			insert_hydration_dev(target, t249, anchor);
    			insert_hydration_dev(target, p28, anchor);
    			append_hydration_dev(p28, strong6);
    			append_hydration_dev(strong6, t250);
    			append_hydration_dev(p28, t251);
    			append_hydration_dev(p28, br5);
    			append_hydration_dev(p28, strong7);
    			append_hydration_dev(strong7, t252);
    			append_hydration_dev(p28, t253);
    			insert_hydration_dev(target, t254, anchor);
    			insert_hydration_dev(target, h212, anchor);
    			append_hydration_dev(h212, t255);
    			insert_hydration_dev(target, t256, anchor);
    			insert_hydration_dev(target, p29, anchor);
    			append_hydration_dev(p29, t257);
    			insert_hydration_dev(target, t258, anchor);
    			insert_hydration_dev(target, pre15, anchor);
    			append_hydration_dev(pre15, code17);
    			append_hydration_dev(code17, t259);
    			insert_hydration_dev(target, t260, anchor);
    			insert_hydration_dev(target, p30, anchor);
    			append_hydration_dev(p30, strong8);
    			append_hydration_dev(strong8, t261);
    			append_hydration_dev(p30, t262);
    			append_hydration_dev(p30, br6);
    			append_hydration_dev(p30, strong9);
    			append_hydration_dev(strong9, t263);
    			append_hydration_dev(p30, t264);
    			insert_hydration_dev(target, t265, anchor);
    			insert_hydration_dev(target, h213, anchor);
    			append_hydration_dev(h213, t266);
    			insert_hydration_dev(target, t267, anchor);
    			insert_hydration_dev(target, p31, anchor);
    			append_hydration_dev(p31, t268);
    			insert_hydration_dev(target, t269, anchor);
    			insert_hydration_dev(target, h39, anchor);
    			append_hydration_dev(h39, t270);
    			insert_hydration_dev(target, t271, anchor);
    			insert_hydration_dev(target, table3, anchor);
    			append_hydration_dev(table3, thead3);
    			append_hydration_dev(thead3, tr13);
    			append_hydration_dev(tr13, th12);
    			append_hydration_dev(th12, t272);
    			append_hydration_dev(tr13, t273);
    			append_hydration_dev(tr13, th13);
    			append_hydration_dev(th13, t274);
    			append_hydration_dev(tr13, t275);
    			append_hydration_dev(tr13, th14);
    			append_hydration_dev(th14, t276);
    			append_hydration_dev(tr13, t277);
    			append_hydration_dev(tr13, th15);
    			append_hydration_dev(th15, t278);
    			append_hydration_dev(table3, t279);
    			append_hydration_dev(table3, tbody3);
    			append_hydration_dev(tbody3, tr14);
    			append_hydration_dev(tr14, td34);
    			append_hydration_dev(td34, t280);
    			append_hydration_dev(tr14, t281);
    			append_hydration_dev(tr14, td35);
    			append_hydration_dev(td35, t282);
    			append_hydration_dev(tr14, t283);
    			append_hydration_dev(tr14, td36);
    			append_hydration_dev(td36, t284);
    			append_hydration_dev(tr14, t285);
    			append_hydration_dev(tr14, td37);
    			append_hydration_dev(td37, t286);
    			append_hydration_dev(tbody3, t287);
    			append_hydration_dev(tbody3, tr15);
    			append_hydration_dev(tr15, td38);
    			append_hydration_dev(td38, t288);
    			append_hydration_dev(tr15, t289);
    			append_hydration_dev(tr15, td39);
    			append_hydration_dev(td39, t290);
    			append_hydration_dev(tr15, t291);
    			append_hydration_dev(tr15, td40);
    			append_hydration_dev(td40, t292);
    			append_hydration_dev(tr15, t293);
    			append_hydration_dev(tr15, td41);
    			append_hydration_dev(td41, t294);
    			append_hydration_dev(tbody3, t295);
    			append_hydration_dev(tbody3, tr16);
    			append_hydration_dev(tr16, td42);
    			append_hydration_dev(td42, t296);
    			append_hydration_dev(tr16, t297);
    			append_hydration_dev(tr16, td43);
    			append_hydration_dev(td43, t298);
    			append_hydration_dev(tr16, t299);
    			append_hydration_dev(tr16, td44);
    			append_hydration_dev(td44, t300);
    			append_hydration_dev(tr16, t301);
    			append_hydration_dev(tr16, td45);
    			append_hydration_dev(td45, t302);
    			append_hydration_dev(tbody3, t303);
    			append_hydration_dev(tbody3, tr17);
    			append_hydration_dev(tr17, td46);
    			append_hydration_dev(td46, t304);
    			append_hydration_dev(tr17, t305);
    			append_hydration_dev(tr17, td47);
    			append_hydration_dev(td47, t306);
    			append_hydration_dev(tr17, t307);
    			append_hydration_dev(tr17, td48);
    			append_hydration_dev(td48, t308);
    			append_hydration_dev(tr17, t309);
    			append_hydration_dev(tr17, td49);
    			append_hydration_dev(td49, t310);
    			append_hydration_dev(tbody3, t311);
    			append_hydration_dev(tbody3, tr18);
    			append_hydration_dev(tr18, td50);
    			append_hydration_dev(td50, t312);
    			append_hydration_dev(tr18, t313);
    			append_hydration_dev(tr18, td51);
    			append_hydration_dev(td51, t314);
    			append_hydration_dev(tr18, t315);
    			append_hydration_dev(tr18, td52);
    			append_hydration_dev(td52, t316);
    			append_hydration_dev(tr18, t317);
    			append_hydration_dev(tr18, td53);
    			append_hydration_dev(td53, t318);
    			insert_hydration_dev(target, t319, anchor);
    			insert_hydration_dev(target, h310, anchor);
    			append_hydration_dev(h310, t320);
    			insert_hydration_dev(target, t321, anchor);
    			insert_hydration_dev(target, table4, anchor);
    			append_hydration_dev(table4, thead4);
    			append_hydration_dev(thead4, tr19);
    			append_hydration_dev(tr19, th16);
    			append_hydration_dev(th16, t322);
    			append_hydration_dev(tr19, t323);
    			append_hydration_dev(tr19, th17);
    			append_hydration_dev(th17, t324);
    			append_hydration_dev(tr19, t325);
    			append_hydration_dev(tr19, th18);
    			append_hydration_dev(th18, t326);
    			append_hydration_dev(tr19, t327);
    			append_hydration_dev(tr19, th19);
    			append_hydration_dev(th19, t328);
    			append_hydration_dev(table4, t329);
    			append_hydration_dev(table4, tbody4);
    			append_hydration_dev(tbody4, tr20);
    			append_hydration_dev(tr20, td54);
    			append_hydration_dev(td54, t330);
    			append_hydration_dev(tr20, t331);
    			append_hydration_dev(tr20, td55);
    			append_hydration_dev(td55, t332);
    			append_hydration_dev(tr20, t333);
    			append_hydration_dev(tr20, td56);
    			append_hydration_dev(td56, t334);
    			append_hydration_dev(tr20, t335);
    			append_hydration_dev(tr20, td57);
    			append_hydration_dev(td57, t336);
    			append_hydration_dev(tbody4, t337);
    			append_hydration_dev(tbody4, tr21);
    			append_hydration_dev(tr21, td58);
    			append_hydration_dev(td58, t338);
    			append_hydration_dev(tr21, t339);
    			append_hydration_dev(tr21, td59);
    			append_hydration_dev(td59, t340);
    			append_hydration_dev(tr21, t341);
    			append_hydration_dev(tr21, td60);
    			append_hydration_dev(td60, t342);
    			append_hydration_dev(tr21, t343);
    			append_hydration_dev(tr21, td61);
    			append_hydration_dev(td61, t344);
    			append_hydration_dev(tbody4, t345);
    			append_hydration_dev(tbody4, tr22);
    			append_hydration_dev(tr22, td62);
    			append_hydration_dev(td62, t346);
    			append_hydration_dev(tr22, t347);
    			append_hydration_dev(tr22, td63);
    			append_hydration_dev(td63, t348);
    			append_hydration_dev(tr22, t349);
    			append_hydration_dev(tr22, td64);
    			append_hydration_dev(td64, t350);
    			append_hydration_dev(tr22, t351);
    			append_hydration_dev(tr22, td65);
    			append_hydration_dev(td65, t352);
    			append_hydration_dev(tbody4, t353);
    			append_hydration_dev(tbody4, tr23);
    			append_hydration_dev(tr23, td66);
    			append_hydration_dev(td66, t354);
    			append_hydration_dev(tr23, t355);
    			append_hydration_dev(tr23, td67);
    			append_hydration_dev(td67, t356);
    			append_hydration_dev(tr23, t357);
    			append_hydration_dev(tr23, td68);
    			append_hydration_dev(td68, t358);
    			append_hydration_dev(tr23, t359);
    			append_hydration_dev(tr23, td69);
    			append_hydration_dev(td69, t360);
    			insert_hydration_dev(target, t361, anchor);
    			insert_hydration_dev(target, h214, anchor);
    			append_hydration_dev(h214, t362);
    			insert_hydration_dev(target, t363, anchor);
    			insert_hydration_dev(target, table5, anchor);
    			append_hydration_dev(table5, thead5);
    			append_hydration_dev(thead5, tr24);
    			append_hydration_dev(tr24, th20);
    			append_hydration_dev(th20, t364);
    			append_hydration_dev(tr24, t365);
    			append_hydration_dev(tr24, th21);
    			append_hydration_dev(th21, t366);
    			append_hydration_dev(tr24, t367);
    			append_hydration_dev(tr24, th22);
    			append_hydration_dev(th22, t368);
    			append_hydration_dev(tr24, t369);
    			append_hydration_dev(tr24, th23);
    			append_hydration_dev(th23, t370);
    			append_hydration_dev(table5, t371);
    			append_hydration_dev(table5, tbody5);
    			append_hydration_dev(tbody5, tr25);
    			append_hydration_dev(tr25, td70);
    			append_hydration_dev(td70, t372);
    			append_hydration_dev(tr25, t373);
    			append_hydration_dev(tr25, td71);
    			append_hydration_dev(td71, t374);
    			append_hydration_dev(tr25, t375);
    			append_hydration_dev(tr25, td72);
    			append_hydration_dev(td72, t376);
    			append_hydration_dev(tr25, t377);
    			append_hydration_dev(tr25, td73);
    			append_hydration_dev(td73, t378);
    			append_hydration_dev(tbody5, t379);
    			append_hydration_dev(tbody5, tr26);
    			append_hydration_dev(tr26, td74);
    			append_hydration_dev(td74, t380);
    			append_hydration_dev(tr26, t381);
    			append_hydration_dev(tr26, td75);
    			append_hydration_dev(td75, t382);
    			append_hydration_dev(tr26, t383);
    			append_hydration_dev(tr26, td76);
    			append_hydration_dev(td76, t384);
    			append_hydration_dev(tr26, t385);
    			append_hydration_dev(tr26, td77);
    			append_hydration_dev(td77, t386);
    			append_hydration_dev(tbody5, t387);
    			append_hydration_dev(tbody5, tr27);
    			append_hydration_dev(tr27, td78);
    			append_hydration_dev(td78, t388);
    			append_hydration_dev(tr27, t389);
    			append_hydration_dev(tr27, td79);
    			append_hydration_dev(td79, t390);
    			append_hydration_dev(tr27, t391);
    			append_hydration_dev(tr27, td80);
    			append_hydration_dev(td80, t392);
    			append_hydration_dev(tr27, t393);
    			append_hydration_dev(tr27, td81);
    			append_hydration_dev(td81, t394);
    			append_hydration_dev(tbody5, t395);
    			append_hydration_dev(tbody5, tr28);
    			append_hydration_dev(tr28, td82);
    			append_hydration_dev(td82, t396);
    			append_hydration_dev(tr28, t397);
    			append_hydration_dev(tr28, td83);
    			append_hydration_dev(td83, t398);
    			append_hydration_dev(tr28, t399);
    			append_hydration_dev(tr28, td84);
    			append_hydration_dev(td84, t400);
    			append_hydration_dev(tr28, t401);
    			append_hydration_dev(tr28, td85);
    			append_hydration_dev(td85, t402);
    			append_hydration_dev(tbody5, t403);
    			append_hydration_dev(tbody5, tr29);
    			append_hydration_dev(tr29, td86);
    			append_hydration_dev(td86, t404);
    			append_hydration_dev(tr29, t405);
    			append_hydration_dev(tr29, td87);
    			append_hydration_dev(td87, t406);
    			append_hydration_dev(tr29, t407);
    			append_hydration_dev(tr29, td88);
    			append_hydration_dev(td88, t408);
    			append_hydration_dev(tr29, t409);
    			append_hydration_dev(tr29, td89);
    			append_hydration_dev(td89, t410);
    			append_hydration_dev(tbody5, t411);
    			append_hydration_dev(tbody5, tr30);
    			append_hydration_dev(tr30, td90);
    			append_hydration_dev(td90, t412);
    			append_hydration_dev(tr30, t413);
    			append_hydration_dev(tr30, td91);
    			append_hydration_dev(td91, t414);
    			append_hydration_dev(tr30, t415);
    			append_hydration_dev(tr30, td92);
    			append_hydration_dev(td92, t416);
    			append_hydration_dev(tr30, t417);
    			append_hydration_dev(tr30, td93);
    			append_hydration_dev(td93, t418);
    			append_hydration_dev(tbody5, t419);
    			append_hydration_dev(tbody5, tr31);
    			append_hydration_dev(tr31, td94);
    			append_hydration_dev(td94, t420);
    			append_hydration_dev(tr31, t421);
    			append_hydration_dev(tr31, td95);
    			append_hydration_dev(td95, t422);
    			append_hydration_dev(tr31, t423);
    			append_hydration_dev(tr31, td96);
    			append_hydration_dev(td96, t424);
    			append_hydration_dev(tr31, t425);
    			append_hydration_dev(tr31, td97);
    			append_hydration_dev(td97, t426);
    			insert_hydration_dev(target, t427, anchor);
    			insert_hydration_dev(target, h15, anchor);
    			append_hydration_dev(h15, t428);
    			insert_hydration_dev(target, t429, anchor);
    			insert_hydration_dev(target, p32, anchor);
    			append_hydration_dev(p32, t430);
    			insert_hydration_dev(target, t431, anchor);
    			insert_hydration_dev(target, h215, anchor);
    			append_hydration_dev(h215, t432);
    			insert_hydration_dev(target, t433, anchor);
    			insert_hydration_dev(target, p33, anchor);
    			append_hydration_dev(p33, t434);
    			insert_hydration_dev(target, t435, anchor);
    			insert_hydration_dev(target, pre16, anchor);
    			append_hydration_dev(pre16, code18);
    			append_hydration_dev(code18, t436);
    			insert_hydration_dev(target, t437, anchor);
    			insert_hydration_dev(target, p34, anchor);
    			append_hydration_dev(p34, t438);
    			append_hydration_dev(p34, a0);
    			append_hydration_dev(a0, t439);
    			insert_hydration_dev(target, t440, anchor);
    			insert_hydration_dev(target, p35, anchor);
    			append_hydration_dev(p35, t441);
    			insert_hydration_dev(target, t442, anchor);
    			insert_hydration_dev(target, pre17, anchor);
    			append_hydration_dev(pre17, code19);
    			append_hydration_dev(code19, t443);
    			insert_hydration_dev(target, t444, anchor);
    			insert_hydration_dev(target, h216, anchor);
    			append_hydration_dev(h216, t445);
    			insert_hydration_dev(target, t446, anchor);
    			insert_hydration_dev(target, p36, anchor);
    			append_hydration_dev(p36, t447);
    			insert_hydration_dev(target, t448, anchor);
    			insert_hydration_dev(target, p37, anchor);
    			append_hydration_dev(p37, t449);
    			append_hydration_dev(p37, br7);
    			append_hydration_dev(p37, t450);
    			insert_hydration_dev(target, t451, anchor);
    			insert_hydration_dev(target, pre18, anchor);
    			append_hydration_dev(pre18, code20);
    			append_hydration_dev(code20, t452);
    			insert_hydration_dev(target, t453, anchor);
    			insert_hydration_dev(target, p38, anchor);
    			append_hydration_dev(p38, t454);
    			append_hydration_dev(p38, a1);
    			append_hydration_dev(a1, t455);
    			insert_hydration_dev(target, t456, anchor);
    			insert_hydration_dev(target, p39, anchor);
    			append_hydration_dev(p39, t457);
    			insert_hydration_dev(target, t458, anchor);
    			insert_hydration_dev(target, pre19, anchor);
    			append_hydration_dev(pre19, code21);
    			append_hydration_dev(code21, t459);
    			insert_hydration_dev(target, t460, anchor);
    			insert_hydration_dev(target, h16, anchor);
    			append_hydration_dev(h16, t461);
    			insert_hydration_dev(target, t462, anchor);
    			insert_hydration_dev(target, p40, anchor);
    			append_hydration_dev(p40, t463);
    			append_hydration_dev(p40, a2);
    			append_hydration_dev(a2, t464);
    			insert_hydration_dev(target, t465, anchor);
    			insert_hydration_dev(target, h217, anchor);
    			append_hydration_dev(h217, t466);
    			insert_hydration_dev(target, t467, anchor);
    			insert_hydration_dev(target, p41, anchor);
    			append_hydration_dev(p41, t468);
    			insert_hydration_dev(target, t469, anchor);
    			insert_hydration_dev(target, pre20, anchor);
    			append_hydration_dev(pre20, code22);
    			append_hydration_dev(code22, t470);
    			insert_hydration_dev(target, t471, anchor);
    			insert_hydration_dev(target, p42, anchor);
    			append_hydration_dev(p42, t472);
    			insert_hydration_dev(target, t473, anchor);
    			insert_hydration_dev(target, pre21, anchor);
    			append_hydration_dev(pre21, code23);
    			append_hydration_dev(code23, t474);
    			insert_hydration_dev(target, t475, anchor);
    			insert_hydration_dev(target, h218, anchor);
    			append_hydration_dev(h218, t476);
    			insert_hydration_dev(target, t477, anchor);
    			insert_hydration_dev(target, p43, anchor);
    			append_hydration_dev(p43, t478);
    			insert_hydration_dev(target, t479, anchor);
    			insert_hydration_dev(target, pre22, anchor);
    			append_hydration_dev(pre22, code24);
    			append_hydration_dev(code24, t480);
    			insert_hydration_dev(target, t481, anchor);
    			insert_hydration_dev(target, p44, anchor);
    			append_hydration_dev(p44, t482);
    			insert_hydration_dev(target, t483, anchor);
    			insert_hydration_dev(target, pre23, anchor);
    			append_hydration_dev(pre23, code25);
    			append_hydration_dev(code25, t484);
    			insert_hydration_dev(target, t485, anchor);
    			insert_hydration_dev(target, h219, anchor);
    			append_hydration_dev(h219, t486);
    			insert_hydration_dev(target, t487, anchor);
    			insert_hydration_dev(target, p45, anchor);
    			append_hydration_dev(p45, t488);
    			insert_hydration_dev(target, t489, anchor);
    			insert_hydration_dev(target, pre24, anchor);
    			append_hydration_dev(pre24, code26);
    			append_hydration_dev(code26, t490);
    			insert_hydration_dev(target, t491, anchor);
    			insert_hydration_dev(target, p46, anchor);
    			append_hydration_dev(p46, t492);
    			insert_hydration_dev(target, t493, anchor);
    			insert_hydration_dev(target, pre25, anchor);
    			append_hydration_dev(pre25, code27);
    			append_hydration_dev(code27, t494);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(ol);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t19);
    			if (detaching) detach_dev(pre0);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t25);
    			if (detaching) detach_dev(pre1);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(h22);
    			if (detaching) detach_dev(t29);
    			if (detaching) detach_dev(p4);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(pre2);
    			if (detaching) detach_dev(t33);
    			if (detaching) detach_dev(h23);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(p5);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(pre3);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(h24);
    			if (detaching) detach_dev(t41);
    			if (detaching) detach_dev(p6);
    			if (detaching) detach_dev(t43);
    			if (detaching) detach_dev(pre4);
    			if (detaching) detach_dev(t45);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t47);
    			if (detaching) detach_dev(h12);
    			if (detaching) detach_dev(t49);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t51);
    			if (detaching) detach_dev(p7);
    			if (detaching) detach_dev(t53);
    			if (detaching) detach_dev(h32);
    			if (detaching) detach_dev(t55);
    			if (detaching) detach_dev(p8);
    			if (detaching) detach_dev(t57);
    			if (detaching) detach_dev(pre5);
    			if (detaching) detach_dev(t59);
    			if (detaching) detach_dev(p9);
    			if (detaching) detach_dev(t62);
    			if (detaching) detach_dev(h33);
    			if (detaching) detach_dev(t64);
    			if (detaching) detach_dev(p10);
    			if (detaching) detach_dev(t66);
    			if (detaching) detach_dev(h34);
    			if (detaching) detach_dev(t68);
    			if (detaching) detach_dev(p11);
    			if (detaching) detach_dev(t71);
    			if (detaching) detach_dev(h35);
    			if (detaching) detach_dev(t73);
    			if (detaching) detach_dev(p12);
    			if (detaching) detach_dev(t75);
    			if (detaching) detach_dev(h13);
    			if (detaching) detach_dev(t77);
    			if (detaching) detach_dev(p13);
    			if (detaching) detach_dev(t79);
    			if (detaching) detach_dev(pre6);
    			if (detaching) detach_dev(t81);
    			if (detaching) detach_dev(p14);
    			if (detaching) detach_dev(t84);
    			if (detaching) detach_dev(h25);
    			if (detaching) detach_dev(t86);
    			if (detaching) detach_dev(p15);
    			if (detaching) detach_dev(t88);
    			if (detaching) detach_dev(pre7);
    			if (detaching) detach_dev(t90);
    			if (detaching) detach_dev(h36);
    			if (detaching) detach_dev(t92);
    			if (detaching) detach_dev(p16);
    			if (detaching) detach_dev(t94);
    			if (detaching) detach_dev(table0);
    			if (detaching) detach_dev(t166);
    			if (detaching) detach_dev(h26);
    			if (detaching) detach_dev(t168);
    			if (detaching) detach_dev(p17);
    			if (detaching) detach_dev(t170);
    			if (detaching) detach_dev(pre8);
    			if (detaching) detach_dev(t172);
    			if (detaching) detach_dev(h37);
    			if (detaching) detach_dev(t174);
    			if (detaching) detach_dev(table1);
    			if (detaching) detach_dev(t183);
    			if (detaching) detach_dev(h27);
    			if (detaching) detach_dev(t185);
    			if (detaching) detach_dev(p18);
    			if (detaching) detach_dev(t189);
    			if (detaching) detach_dev(pre9);
    			if (detaching) detach_dev(t191);
    			if (detaching) detach_dev(h38);
    			if (detaching) detach_dev(t193);
    			if (detaching) detach_dev(table2);
    			if (detaching) detach_dev(t202);
    			if (detaching) detach_dev(h14);
    			if (detaching) detach_dev(t204);
    			if (detaching) detach_dev(p19);
    			if (detaching) detach_dev(t206);
    			if (detaching) detach_dev(h28);
    			if (detaching) detach_dev(t208);
    			if (detaching) detach_dev(p20);
    			if (detaching) detach_dev(t210);
    			if (detaching) detach_dev(pre10);
    			if (detaching) detach_dev(t212);
    			if (detaching) detach_dev(p21);
    			if (detaching) detach_dev(t217);
    			if (detaching) detach_dev(h29);
    			if (detaching) detach_dev(t219);
    			if (detaching) detach_dev(p22);
    			if (detaching) detach_dev(t221);
    			if (detaching) detach_dev(pre11);
    			if (detaching) detach_dev(t223);
    			if (detaching) detach_dev(p23);
    			if (detaching) detach_dev(t225);
    			if (detaching) detach_dev(pre12);
    			if (detaching) detach_dev(t227);
    			if (detaching) detach_dev(p24);
    			if (detaching) detach_dev(t232);
    			if (detaching) detach_dev(h210);
    			if (detaching) detach_dev(t234);
    			if (detaching) detach_dev(p25);
    			if (detaching) detach_dev(t236);
    			if (detaching) detach_dev(pre13);
    			if (detaching) detach_dev(t238);
    			if (detaching) detach_dev(p26);
    			if (detaching) detach_dev(t243);
    			if (detaching) detach_dev(h211);
    			if (detaching) detach_dev(t245);
    			if (detaching) detach_dev(p27);
    			if (detaching) detach_dev(t247);
    			if (detaching) detach_dev(pre14);
    			if (detaching) detach_dev(t249);
    			if (detaching) detach_dev(p28);
    			if (detaching) detach_dev(t254);
    			if (detaching) detach_dev(h212);
    			if (detaching) detach_dev(t256);
    			if (detaching) detach_dev(p29);
    			if (detaching) detach_dev(t258);
    			if (detaching) detach_dev(pre15);
    			if (detaching) detach_dev(t260);
    			if (detaching) detach_dev(p30);
    			if (detaching) detach_dev(t265);
    			if (detaching) detach_dev(h213);
    			if (detaching) detach_dev(t267);
    			if (detaching) detach_dev(p31);
    			if (detaching) detach_dev(t269);
    			if (detaching) detach_dev(h39);
    			if (detaching) detach_dev(t271);
    			if (detaching) detach_dev(table3);
    			if (detaching) detach_dev(t319);
    			if (detaching) detach_dev(h310);
    			if (detaching) detach_dev(t321);
    			if (detaching) detach_dev(table4);
    			if (detaching) detach_dev(t361);
    			if (detaching) detach_dev(h214);
    			if (detaching) detach_dev(t363);
    			if (detaching) detach_dev(table5);
    			if (detaching) detach_dev(t427);
    			if (detaching) detach_dev(h15);
    			if (detaching) detach_dev(t429);
    			if (detaching) detach_dev(p32);
    			if (detaching) detach_dev(t431);
    			if (detaching) detach_dev(h215);
    			if (detaching) detach_dev(t433);
    			if (detaching) detach_dev(p33);
    			if (detaching) detach_dev(t435);
    			if (detaching) detach_dev(pre16);
    			if (detaching) detach_dev(t437);
    			if (detaching) detach_dev(p34);
    			if (detaching) detach_dev(t440);
    			if (detaching) detach_dev(p35);
    			if (detaching) detach_dev(t442);
    			if (detaching) detach_dev(pre17);
    			if (detaching) detach_dev(t444);
    			if (detaching) detach_dev(h216);
    			if (detaching) detach_dev(t446);
    			if (detaching) detach_dev(p36);
    			if (detaching) detach_dev(t448);
    			if (detaching) detach_dev(p37);
    			if (detaching) detach_dev(t451);
    			if (detaching) detach_dev(pre18);
    			if (detaching) detach_dev(t453);
    			if (detaching) detach_dev(p38);
    			if (detaching) detach_dev(t456);
    			if (detaching) detach_dev(p39);
    			if (detaching) detach_dev(t458);
    			if (detaching) detach_dev(pre19);
    			if (detaching) detach_dev(t460);
    			if (detaching) detach_dev(h16);
    			if (detaching) detach_dev(t462);
    			if (detaching) detach_dev(p40);
    			if (detaching) detach_dev(t465);
    			if (detaching) detach_dev(h217);
    			if (detaching) detach_dev(t467);
    			if (detaching) detach_dev(p41);
    			if (detaching) detach_dev(t469);
    			if (detaching) detach_dev(pre20);
    			if (detaching) detach_dev(t471);
    			if (detaching) detach_dev(p42);
    			if (detaching) detach_dev(t473);
    			if (detaching) detach_dev(pre21);
    			if (detaching) detach_dev(t475);
    			if (detaching) detach_dev(h218);
    			if (detaching) detach_dev(t477);
    			if (detaching) detach_dev(p43);
    			if (detaching) detach_dev(t479);
    			if (detaching) detach_dev(pre22);
    			if (detaching) detach_dev(t481);
    			if (detaching) detach_dev(p44);
    			if (detaching) detach_dev(t483);
    			if (detaching) detach_dev(pre23);
    			if (detaching) detach_dev(t485);
    			if (detaching) detach_dev(h219);
    			if (detaching) detach_dev(t487);
    			if (detaching) detach_dev(p45);
    			if (detaching) detach_dev(t489);
    			if (detaching) detach_dev(pre24);
    			if (detaching) detach_dev(t491);
    			if (detaching) detach_dev(p46);
    			if (detaching) detach_dev(t493);
    			if (detaching) detach_dev(pre25);
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

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Content', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Content> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Content extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Content",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/docs/Table.svelte generated by Svelte v3.42.5 */

    const file$2 = "src/docs/Table.svelte";

    function create_fragment$2(ctx) {
    	let ol8;
    	let li10;
    	let a0;
    	let t0;
    	let ol2;
    	let li5;
    	let a1;
    	let t1;
    	let ol0;
    	let li0;
    	let a2;
    	let t2;
    	let t3;
    	let li1;
    	let a3;
    	let t4;
    	let t5;
    	let li2;
    	let a4;
    	let t6;
    	let t7;
    	let li3;
    	let a5;
    	let t8;
    	let t9;
    	let li4;
    	let a6;
    	let t10;
    	let t11;
    	let li9;
    	let a7;
    	let t12;
    	let ol1;
    	let li6;
    	let a8;
    	let t13;
    	let t14;
    	let li7;
    	let a9;
    	let t15;
    	let t16;
    	let li8;
    	let a10;
    	let t17;
    	let t18;
    	let li16;
    	let a11;
    	let t19;
    	let ol3;
    	let li11;
    	let a12;
    	let t20;
    	let t21;
    	let li12;
    	let a13;
    	let t22;
    	let t23;
    	let li13;
    	let a14;
    	let t24;
    	let t25;
    	let li14;
    	let a15;
    	let t26;
    	let t27;
    	let li15;
    	let a16;
    	let t28;
    	let t29;
    	let li25;
    	let a17;
    	let t30;
    	let ol5;
    	let li17;
    	let a18;
    	let t31;
    	let t32;
    	let li18;
    	let a19;
    	let t33;
    	let t34;
    	let li19;
    	let a20;
    	let t35;
    	let t36;
    	let li20;
    	let a21;
    	let t37;
    	let t38;
    	let li23;
    	let a22;
    	let t39;
    	let ol4;
    	let li21;
    	let a23;
    	let t40;
    	let t41;
    	let li22;
    	let a24;
    	let t42;
    	let t43;
    	let li24;
    	let a25;
    	let t44;
    	let t45;
    	let li28;
    	let a26;
    	let t46;
    	let ol6;
    	let li26;
    	let a27;
    	let t47;
    	let t48;
    	let li27;
    	let a28;
    	let t49;
    	let t50;
    	let li32;
    	let a29;
    	let t51;
    	let ol7;
    	let li29;
    	let a30;
    	let t52;
    	let t53;
    	let li30;
    	let a31;
    	let t54;
    	let t55;
    	let li31;
    	let a32;
    	let t56;

    	const block = {
    		c: function create() {
    			ol8 = element("ol");
    			li10 = element("li");
    			a0 = element("a");
    			t0 = text$1("Data Types");
    			ol2 = element("ol");
    			li5 = element("li");
    			a1 = element("a");
    			t1 = text$1("Primitive");
    			ol0 = element("ol");
    			li0 = element("li");
    			a2 = element("a");
    			t2 = text$1("Number");
    			t3 = space();
    			li1 = element("li");
    			a3 = element("a");
    			t4 = text$1("Word");
    			t5 = space();
    			li2 = element("li");
    			a4 = element("a");
    			t6 = text$1("Boolean");
    			t7 = space();
    			li3 = element("li");
    			a5 = element("a");
    			t8 = text$1("Null");
    			t9 = space();
    			li4 = element("li");
    			a6 = element("a");
    			t10 = text$1("Undefined");
    			t11 = space();
    			li9 = element("li");
    			a7 = element("a");
    			t12 = text$1("Refrence");
    			ol1 = element("ol");
    			li6 = element("li");
    			a8 = element("a");
    			t13 = text$1("String");
    			t14 = space();
    			li7 = element("li");
    			a9 = element("a");
    			t15 = text$1("Array");
    			t16 = space();
    			li8 = element("li");
    			a10 = element("a");
    			t17 = text$1("Object");
    			t18 = space();
    			li16 = element("li");
    			a11 = element("a");
    			t19 = text$1("Concepts");
    			ol3 = element("ol");
    			li11 = element("li");
    			a12 = element("a");
    			t20 = text$1("Variables");
    			t21 = space();
    			li12 = element("li");
    			a13 = element("a");
    			t22 = text$1("Comments");
    			t23 = space();
    			li13 = element("li");
    			a14 = element("a");
    			t24 = text$1("Piping");
    			t25 = space();
    			li14 = element("li");
    			a15 = element("a");
    			t26 = text$1("Code Block");
    			t27 = space();
    			li15 = element("li");
    			a16 = element("a");
    			t28 = text$1("Functions");
    			t29 = space();
    			li25 = element("li");
    			a17 = element("a");
    			t30 = text$1("Commands");
    			ol5 = element("ol");
    			li17 = element("li");
    			a18 = element("a");
    			t31 = text$1("set");
    			t32 = space();
    			li18 = element("li");
    			a19 = element("a");
    			t33 = text$1("get");
    			t34 = space();
    			li19 = element("li");
    			a20 = element("a");
    			t35 = text$1("log");
    			t36 = space();
    			li20 = element("li");
    			a21 = element("a");
    			t37 = text$1("call");
    			t38 = space();
    			li23 = element("li");
    			a22 = element("a");
    			t39 = text$1("Arithmetic");
    			ol4 = element("ol");
    			li21 = element("li");
    			a23 = element("a");
    			t40 = text$1("Operators");
    			t41 = space();
    			li22 = element("li");
    			a24 = element("a");
    			t42 = text$1("Functions");
    			t43 = space();
    			li24 = element("li");
    			a25 = element("a");
    			t44 = text$1("Logic Operators");
    			t45 = space();
    			li28 = element("li");
    			a26 = element("a");
    			t46 = text$1("Conditional Flow");
    			ol6 = element("ol");
    			li26 = element("li");
    			a27 = element("a");
    			t47 = text$1("If Statements");
    			t48 = space();
    			li27 = element("li");
    			a28 = element("a");
    			t49 = text$1("Switch Case");
    			t50 = space();
    			li32 = element("li");
    			a29 = element("a");
    			t51 = text$1("Iteration");
    			ol7 = element("ol");
    			li29 = element("li");
    			a30 = element("a");
    			t52 = text$1("While Loop");
    			t53 = space();
    			li30 = element("li");
    			a31 = element("a");
    			t54 = text$1("Basic Loop");
    			t55 = space();
    			li31 = element("li");
    			a32 = element("a");
    			t56 = text$1("Foreach Loop");
    			this.h();
    		},
    		l: function claim(nodes) {
    			ol8 = claim_element(nodes, "OL", {});
    			var ol8_nodes = children(ol8);
    			li10 = claim_element(ol8_nodes, "LI", {});
    			var li10_nodes = children(li10);
    			a0 = claim_element(li10_nodes, "A", { href: true });
    			var a0_nodes = children(a0);
    			t0 = claim_text(a0_nodes, "Data Types");
    			a0_nodes.forEach(detach_dev);
    			ol2 = claim_element(li10_nodes, "OL", {});
    			var ol2_nodes = children(ol2);
    			li5 = claim_element(ol2_nodes, "LI", {});
    			var li5_nodes = children(li5);
    			a1 = claim_element(li5_nodes, "A", { href: true });
    			var a1_nodes = children(a1);
    			t1 = claim_text(a1_nodes, "Primitive");
    			a1_nodes.forEach(detach_dev);
    			ol0 = claim_element(li5_nodes, "OL", {});
    			var ol0_nodes = children(ol0);
    			li0 = claim_element(ol0_nodes, "LI", {});
    			var li0_nodes = children(li0);
    			a2 = claim_element(li0_nodes, "A", { href: true });
    			var a2_nodes = children(a2);
    			t2 = claim_text(a2_nodes, "Number");
    			a2_nodes.forEach(detach_dev);
    			li0_nodes.forEach(detach_dev);
    			t3 = claim_space(ol0_nodes);
    			li1 = claim_element(ol0_nodes, "LI", {});
    			var li1_nodes = children(li1);
    			a3 = claim_element(li1_nodes, "A", { href: true });
    			var a3_nodes = children(a3);
    			t4 = claim_text(a3_nodes, "Word");
    			a3_nodes.forEach(detach_dev);
    			li1_nodes.forEach(detach_dev);
    			t5 = claim_space(ol0_nodes);
    			li2 = claim_element(ol0_nodes, "LI", {});
    			var li2_nodes = children(li2);
    			a4 = claim_element(li2_nodes, "A", { href: true });
    			var a4_nodes = children(a4);
    			t6 = claim_text(a4_nodes, "Boolean");
    			a4_nodes.forEach(detach_dev);
    			li2_nodes.forEach(detach_dev);
    			t7 = claim_space(ol0_nodes);
    			li3 = claim_element(ol0_nodes, "LI", {});
    			var li3_nodes = children(li3);
    			a5 = claim_element(li3_nodes, "A", { href: true });
    			var a5_nodes = children(a5);
    			t8 = claim_text(a5_nodes, "Null");
    			a5_nodes.forEach(detach_dev);
    			li3_nodes.forEach(detach_dev);
    			t9 = claim_space(ol0_nodes);
    			li4 = claim_element(ol0_nodes, "LI", {});
    			var li4_nodes = children(li4);
    			a6 = claim_element(li4_nodes, "A", { href: true });
    			var a6_nodes = children(a6);
    			t10 = claim_text(a6_nodes, "Undefined");
    			a6_nodes.forEach(detach_dev);
    			li4_nodes.forEach(detach_dev);
    			ol0_nodes.forEach(detach_dev);
    			li5_nodes.forEach(detach_dev);
    			t11 = claim_space(ol2_nodes);
    			li9 = claim_element(ol2_nodes, "LI", {});
    			var li9_nodes = children(li9);
    			a7 = claim_element(li9_nodes, "A", { href: true });
    			var a7_nodes = children(a7);
    			t12 = claim_text(a7_nodes, "Refrence");
    			a7_nodes.forEach(detach_dev);
    			ol1 = claim_element(li9_nodes, "OL", {});
    			var ol1_nodes = children(ol1);
    			li6 = claim_element(ol1_nodes, "LI", {});
    			var li6_nodes = children(li6);
    			a8 = claim_element(li6_nodes, "A", { href: true });
    			var a8_nodes = children(a8);
    			t13 = claim_text(a8_nodes, "String");
    			a8_nodes.forEach(detach_dev);
    			li6_nodes.forEach(detach_dev);
    			t14 = claim_space(ol1_nodes);
    			li7 = claim_element(ol1_nodes, "LI", {});
    			var li7_nodes = children(li7);
    			a9 = claim_element(li7_nodes, "A", { href: true });
    			var a9_nodes = children(a9);
    			t15 = claim_text(a9_nodes, "Array");
    			a9_nodes.forEach(detach_dev);
    			li7_nodes.forEach(detach_dev);
    			t16 = claim_space(ol1_nodes);
    			li8 = claim_element(ol1_nodes, "LI", {});
    			var li8_nodes = children(li8);
    			a10 = claim_element(li8_nodes, "A", { href: true });
    			var a10_nodes = children(a10);
    			t17 = claim_text(a10_nodes, "Object");
    			a10_nodes.forEach(detach_dev);
    			li8_nodes.forEach(detach_dev);
    			ol1_nodes.forEach(detach_dev);
    			li9_nodes.forEach(detach_dev);
    			ol2_nodes.forEach(detach_dev);
    			li10_nodes.forEach(detach_dev);
    			t18 = claim_space(ol8_nodes);
    			li16 = claim_element(ol8_nodes, "LI", {});
    			var li16_nodes = children(li16);
    			a11 = claim_element(li16_nodes, "A", { href: true });
    			var a11_nodes = children(a11);
    			t19 = claim_text(a11_nodes, "Concepts");
    			a11_nodes.forEach(detach_dev);
    			ol3 = claim_element(li16_nodes, "OL", {});
    			var ol3_nodes = children(ol3);
    			li11 = claim_element(ol3_nodes, "LI", {});
    			var li11_nodes = children(li11);
    			a12 = claim_element(li11_nodes, "A", { href: true });
    			var a12_nodes = children(a12);
    			t20 = claim_text(a12_nodes, "Variables");
    			a12_nodes.forEach(detach_dev);
    			li11_nodes.forEach(detach_dev);
    			t21 = claim_space(ol3_nodes);
    			li12 = claim_element(ol3_nodes, "LI", {});
    			var li12_nodes = children(li12);
    			a13 = claim_element(li12_nodes, "A", { href: true });
    			var a13_nodes = children(a13);
    			t22 = claim_text(a13_nodes, "Comments");
    			a13_nodes.forEach(detach_dev);
    			li12_nodes.forEach(detach_dev);
    			t23 = claim_space(ol3_nodes);
    			li13 = claim_element(ol3_nodes, "LI", {});
    			var li13_nodes = children(li13);
    			a14 = claim_element(li13_nodes, "A", { href: true });
    			var a14_nodes = children(a14);
    			t24 = claim_text(a14_nodes, "Piping");
    			a14_nodes.forEach(detach_dev);
    			li13_nodes.forEach(detach_dev);
    			t25 = claim_space(ol3_nodes);
    			li14 = claim_element(ol3_nodes, "LI", {});
    			var li14_nodes = children(li14);
    			a15 = claim_element(li14_nodes, "A", { href: true });
    			var a15_nodes = children(a15);
    			t26 = claim_text(a15_nodes, "Code Block");
    			a15_nodes.forEach(detach_dev);
    			li14_nodes.forEach(detach_dev);
    			t27 = claim_space(ol3_nodes);
    			li15 = claim_element(ol3_nodes, "LI", {});
    			var li15_nodes = children(li15);
    			a16 = claim_element(li15_nodes, "A", { href: true });
    			var a16_nodes = children(a16);
    			t28 = claim_text(a16_nodes, "Functions");
    			a16_nodes.forEach(detach_dev);
    			li15_nodes.forEach(detach_dev);
    			ol3_nodes.forEach(detach_dev);
    			li16_nodes.forEach(detach_dev);
    			t29 = claim_space(ol8_nodes);
    			li25 = claim_element(ol8_nodes, "LI", {});
    			var li25_nodes = children(li25);
    			a17 = claim_element(li25_nodes, "A", { href: true });
    			var a17_nodes = children(a17);
    			t30 = claim_text(a17_nodes, "Commands");
    			a17_nodes.forEach(detach_dev);
    			ol5 = claim_element(li25_nodes, "OL", {});
    			var ol5_nodes = children(ol5);
    			li17 = claim_element(ol5_nodes, "LI", {});
    			var li17_nodes = children(li17);
    			a18 = claim_element(li17_nodes, "A", { href: true });
    			var a18_nodes = children(a18);
    			t31 = claim_text(a18_nodes, "set");
    			a18_nodes.forEach(detach_dev);
    			li17_nodes.forEach(detach_dev);
    			t32 = claim_space(ol5_nodes);
    			li18 = claim_element(ol5_nodes, "LI", {});
    			var li18_nodes = children(li18);
    			a19 = claim_element(li18_nodes, "A", { href: true });
    			var a19_nodes = children(a19);
    			t33 = claim_text(a19_nodes, "get");
    			a19_nodes.forEach(detach_dev);
    			li18_nodes.forEach(detach_dev);
    			t34 = claim_space(ol5_nodes);
    			li19 = claim_element(ol5_nodes, "LI", {});
    			var li19_nodes = children(li19);
    			a20 = claim_element(li19_nodes, "A", { href: true });
    			var a20_nodes = children(a20);
    			t35 = claim_text(a20_nodes, "log");
    			a20_nodes.forEach(detach_dev);
    			li19_nodes.forEach(detach_dev);
    			t36 = claim_space(ol5_nodes);
    			li20 = claim_element(ol5_nodes, "LI", {});
    			var li20_nodes = children(li20);
    			a21 = claim_element(li20_nodes, "A", { href: true });
    			var a21_nodes = children(a21);
    			t37 = claim_text(a21_nodes, "call");
    			a21_nodes.forEach(detach_dev);
    			li20_nodes.forEach(detach_dev);
    			t38 = claim_space(ol5_nodes);
    			li23 = claim_element(ol5_nodes, "LI", {});
    			var li23_nodes = children(li23);
    			a22 = claim_element(li23_nodes, "A", { href: true });
    			var a22_nodes = children(a22);
    			t39 = claim_text(a22_nodes, "Arithmetic");
    			a22_nodes.forEach(detach_dev);
    			ol4 = claim_element(li23_nodes, "OL", {});
    			var ol4_nodes = children(ol4);
    			li21 = claim_element(ol4_nodes, "LI", {});
    			var li21_nodes = children(li21);
    			a23 = claim_element(li21_nodes, "A", { href: true });
    			var a23_nodes = children(a23);
    			t40 = claim_text(a23_nodes, "Operators");
    			a23_nodes.forEach(detach_dev);
    			li21_nodes.forEach(detach_dev);
    			t41 = claim_space(ol4_nodes);
    			li22 = claim_element(ol4_nodes, "LI", {});
    			var li22_nodes = children(li22);
    			a24 = claim_element(li22_nodes, "A", { href: true });
    			var a24_nodes = children(a24);
    			t42 = claim_text(a24_nodes, "Functions");
    			a24_nodes.forEach(detach_dev);
    			li22_nodes.forEach(detach_dev);
    			ol4_nodes.forEach(detach_dev);
    			li23_nodes.forEach(detach_dev);
    			t43 = claim_space(ol5_nodes);
    			li24 = claim_element(ol5_nodes, "LI", {});
    			var li24_nodes = children(li24);
    			a25 = claim_element(li24_nodes, "A", { href: true });
    			var a25_nodes = children(a25);
    			t44 = claim_text(a25_nodes, "Logic Operators");
    			a25_nodes.forEach(detach_dev);
    			li24_nodes.forEach(detach_dev);
    			ol5_nodes.forEach(detach_dev);
    			li25_nodes.forEach(detach_dev);
    			t45 = claim_space(ol8_nodes);
    			li28 = claim_element(ol8_nodes, "LI", {});
    			var li28_nodes = children(li28);
    			a26 = claim_element(li28_nodes, "A", { href: true });
    			var a26_nodes = children(a26);
    			t46 = claim_text(a26_nodes, "Conditional Flow");
    			a26_nodes.forEach(detach_dev);
    			ol6 = claim_element(li28_nodes, "OL", {});
    			var ol6_nodes = children(ol6);
    			li26 = claim_element(ol6_nodes, "LI", {});
    			var li26_nodes = children(li26);
    			a27 = claim_element(li26_nodes, "A", { href: true });
    			var a27_nodes = children(a27);
    			t47 = claim_text(a27_nodes, "If Statements");
    			a27_nodes.forEach(detach_dev);
    			li26_nodes.forEach(detach_dev);
    			t48 = claim_space(ol6_nodes);
    			li27 = claim_element(ol6_nodes, "LI", {});
    			var li27_nodes = children(li27);
    			a28 = claim_element(li27_nodes, "A", { href: true });
    			var a28_nodes = children(a28);
    			t49 = claim_text(a28_nodes, "Switch Case");
    			a28_nodes.forEach(detach_dev);
    			li27_nodes.forEach(detach_dev);
    			ol6_nodes.forEach(detach_dev);
    			li28_nodes.forEach(detach_dev);
    			t50 = claim_space(ol8_nodes);
    			li32 = claim_element(ol8_nodes, "LI", {});
    			var li32_nodes = children(li32);
    			a29 = claim_element(li32_nodes, "A", { href: true });
    			var a29_nodes = children(a29);
    			t51 = claim_text(a29_nodes, "Iteration");
    			a29_nodes.forEach(detach_dev);
    			ol7 = claim_element(li32_nodes, "OL", {});
    			var ol7_nodes = children(ol7);
    			li29 = claim_element(ol7_nodes, "LI", {});
    			var li29_nodes = children(li29);
    			a30 = claim_element(li29_nodes, "A", { href: true });
    			var a30_nodes = children(a30);
    			t52 = claim_text(a30_nodes, "While Loop");
    			a30_nodes.forEach(detach_dev);
    			li29_nodes.forEach(detach_dev);
    			t53 = claim_space(ol7_nodes);
    			li30 = claim_element(ol7_nodes, "LI", {});
    			var li30_nodes = children(li30);
    			a31 = claim_element(li30_nodes, "A", { href: true });
    			var a31_nodes = children(a31);
    			t54 = claim_text(a31_nodes, "Basic Loop");
    			a31_nodes.forEach(detach_dev);
    			li30_nodes.forEach(detach_dev);
    			t55 = claim_space(ol7_nodes);
    			li31 = claim_element(ol7_nodes, "LI", {});
    			var li31_nodes = children(li31);
    			a32 = claim_element(li31_nodes, "A", { href: true });
    			var a32_nodes = children(a32);
    			t56 = claim_text(a32_nodes, "Foreach Loop");
    			a32_nodes.forEach(detach_dev);
    			li31_nodes.forEach(detach_dev);
    			ol7_nodes.forEach(detach_dev);
    			li32_nodes.forEach(detach_dev);
    			ol8_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(a0, "href", "#data-types");
    			add_location(a0, file$2, 1, 4, 9);
    			attr_dev(a1, "href", "#primitive");
    			add_location(a1, file$2, 2, 4, 54);
    			attr_dev(a2, "href", "#number");
    			add_location(a2, file$2, 3, 4, 97);
    			add_location(li0, file$2, 3, 0, 93);
    			attr_dev(a3, "href", "#word");
    			add_location(a3, file$2, 4, 4, 135);
    			add_location(li1, file$2, 4, 0, 131);
    			attr_dev(a4, "href", "#boolean");
    			add_location(a4, file$2, 5, 4, 169);
    			add_location(li2, file$2, 5, 0, 165);
    			attr_dev(a5, "href", "#null");
    			add_location(a5, file$2, 6, 4, 209);
    			add_location(li3, file$2, 6, 0, 205);
    			attr_dev(a6, "href", "#undefined");
    			add_location(a6, file$2, 7, 4, 243);
    			add_location(li4, file$2, 7, 0, 239);
    			add_location(ol0, file$2, 2, 38, 88);
    			add_location(li5, file$2, 2, 0, 50);
    			attr_dev(a7, "href", "#refrence");
    			add_location(a7, file$2, 10, 4, 299);
    			attr_dev(a8, "href", "#string");
    			add_location(a8, file$2, 11, 4, 340);
    			add_location(li6, file$2, 11, 0, 336);
    			attr_dev(a9, "href", "#array");
    			add_location(a9, file$2, 12, 4, 378);
    			add_location(li7, file$2, 12, 0, 374);
    			attr_dev(a10, "href", "#object");
    			add_location(a10, file$2, 13, 4, 414);
    			add_location(li8, file$2, 13, 0, 410);
    			add_location(ol1, file$2, 10, 36, 331);
    			add_location(li9, file$2, 10, 0, 295);
    			add_location(ol2, file$2, 1, 40, 45);
    			add_location(li10, file$2, 1, 0, 5);
    			attr_dev(a11, "href", "#concepts");
    			add_location(a11, file$2, 18, 4, 476);
    			attr_dev(a12, "href", "#variables");
    			add_location(a12, file$2, 19, 4, 517);
    			add_location(li11, file$2, 19, 0, 513);
    			attr_dev(a13, "href", "#comments");
    			add_location(a13, file$2, 20, 4, 561);
    			add_location(li12, file$2, 20, 0, 557);
    			attr_dev(a14, "href", "#piping");
    			add_location(a14, file$2, 21, 4, 603);
    			add_location(li13, file$2, 21, 0, 599);
    			attr_dev(a15, "href", "#code-block");
    			add_location(a15, file$2, 22, 4, 641);
    			add_location(li14, file$2, 22, 0, 637);
    			attr_dev(a16, "href", "#functions");
    			add_location(a16, file$2, 23, 4, 687);
    			add_location(li15, file$2, 23, 0, 683);
    			add_location(ol3, file$2, 18, 36, 508);
    			add_location(li16, file$2, 18, 0, 472);
    			attr_dev(a17, "href", "#commands");
    			add_location(a17, file$2, 26, 4, 743);
    			attr_dev(a18, "href", "#set");
    			add_location(a18, file$2, 27, 4, 784);
    			add_location(li17, file$2, 27, 0, 780);
    			attr_dev(a19, "href", "#get");
    			add_location(a19, file$2, 28, 4, 816);
    			add_location(li18, file$2, 28, 0, 812);
    			attr_dev(a20, "href", "#log");
    			add_location(a20, file$2, 29, 4, 848);
    			add_location(li19, file$2, 29, 0, 844);
    			attr_dev(a21, "href", "#call");
    			add_location(a21, file$2, 30, 4, 880);
    			add_location(li20, file$2, 30, 0, 876);
    			attr_dev(a22, "href", "#arithmetic");
    			add_location(a22, file$2, 31, 4, 914);
    			attr_dev(a23, "href", "#operators");
    			add_location(a23, file$2, 32, 4, 959);
    			add_location(li21, file$2, 32, 0, 955);
    			attr_dev(a24, "href", "#functions");
    			add_location(a24, file$2, 33, 4, 1003);
    			add_location(li22, file$2, 33, 0, 999);
    			add_location(ol4, file$2, 31, 40, 950);
    			add_location(li23, file$2, 31, 0, 910);
    			attr_dev(a25, "href", "#logic-operators");
    			add_location(a25, file$2, 36, 4, 1059);
    			add_location(li24, file$2, 36, 0, 1055);
    			add_location(ol5, file$2, 26, 36, 775);
    			add_location(li25, file$2, 26, 0, 739);
    			attr_dev(a26, "href", "#conditional-flow");
    			add_location(a26, file$2, 39, 4, 1127);
    			attr_dev(a27, "href", "#if-statements");
    			add_location(a27, file$2, 40, 4, 1184);
    			add_location(li26, file$2, 40, 0, 1180);
    			attr_dev(a28, "href", "#switch-case");
    			add_location(a28, file$2, 41, 4, 1236);
    			add_location(li27, file$2, 41, 0, 1232);
    			add_location(ol6, file$2, 39, 52, 1175);
    			add_location(li28, file$2, 39, 0, 1123);
    			attr_dev(a29, "href", "#iteration");
    			add_location(a29, file$2, 44, 4, 1296);
    			attr_dev(a30, "href", "#while-loop");
    			add_location(a30, file$2, 45, 4, 1339);
    			add_location(li29, file$2, 45, 0, 1335);
    			attr_dev(a31, "href", "#basic-loop");
    			add_location(a31, file$2, 46, 4, 1385);
    			add_location(li30, file$2, 46, 0, 1381);
    			attr_dev(a32, "href", "#foreach-loop");
    			add_location(a32, file$2, 47, 4, 1431);
    			add_location(li31, file$2, 47, 0, 1427);
    			add_location(ol7, file$2, 44, 38, 1330);
    			add_location(li32, file$2, 44, 0, 1292);
    			add_location(ol8, file$2, 0, 0, 0);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, ol8, anchor);
    			append_hydration_dev(ol8, li10);
    			append_hydration_dev(li10, a0);
    			append_hydration_dev(a0, t0);
    			append_hydration_dev(li10, ol2);
    			append_hydration_dev(ol2, li5);
    			append_hydration_dev(li5, a1);
    			append_hydration_dev(a1, t1);
    			append_hydration_dev(li5, ol0);
    			append_hydration_dev(ol0, li0);
    			append_hydration_dev(li0, a2);
    			append_hydration_dev(a2, t2);
    			append_hydration_dev(ol0, t3);
    			append_hydration_dev(ol0, li1);
    			append_hydration_dev(li1, a3);
    			append_hydration_dev(a3, t4);
    			append_hydration_dev(ol0, t5);
    			append_hydration_dev(ol0, li2);
    			append_hydration_dev(li2, a4);
    			append_hydration_dev(a4, t6);
    			append_hydration_dev(ol0, t7);
    			append_hydration_dev(ol0, li3);
    			append_hydration_dev(li3, a5);
    			append_hydration_dev(a5, t8);
    			append_hydration_dev(ol0, t9);
    			append_hydration_dev(ol0, li4);
    			append_hydration_dev(li4, a6);
    			append_hydration_dev(a6, t10);
    			append_hydration_dev(ol2, t11);
    			append_hydration_dev(ol2, li9);
    			append_hydration_dev(li9, a7);
    			append_hydration_dev(a7, t12);
    			append_hydration_dev(li9, ol1);
    			append_hydration_dev(ol1, li6);
    			append_hydration_dev(li6, a8);
    			append_hydration_dev(a8, t13);
    			append_hydration_dev(ol1, t14);
    			append_hydration_dev(ol1, li7);
    			append_hydration_dev(li7, a9);
    			append_hydration_dev(a9, t15);
    			append_hydration_dev(ol1, t16);
    			append_hydration_dev(ol1, li8);
    			append_hydration_dev(li8, a10);
    			append_hydration_dev(a10, t17);
    			append_hydration_dev(ol8, t18);
    			append_hydration_dev(ol8, li16);
    			append_hydration_dev(li16, a11);
    			append_hydration_dev(a11, t19);
    			append_hydration_dev(li16, ol3);
    			append_hydration_dev(ol3, li11);
    			append_hydration_dev(li11, a12);
    			append_hydration_dev(a12, t20);
    			append_hydration_dev(ol3, t21);
    			append_hydration_dev(ol3, li12);
    			append_hydration_dev(li12, a13);
    			append_hydration_dev(a13, t22);
    			append_hydration_dev(ol3, t23);
    			append_hydration_dev(ol3, li13);
    			append_hydration_dev(li13, a14);
    			append_hydration_dev(a14, t24);
    			append_hydration_dev(ol3, t25);
    			append_hydration_dev(ol3, li14);
    			append_hydration_dev(li14, a15);
    			append_hydration_dev(a15, t26);
    			append_hydration_dev(ol3, t27);
    			append_hydration_dev(ol3, li15);
    			append_hydration_dev(li15, a16);
    			append_hydration_dev(a16, t28);
    			append_hydration_dev(ol8, t29);
    			append_hydration_dev(ol8, li25);
    			append_hydration_dev(li25, a17);
    			append_hydration_dev(a17, t30);
    			append_hydration_dev(li25, ol5);
    			append_hydration_dev(ol5, li17);
    			append_hydration_dev(li17, a18);
    			append_hydration_dev(a18, t31);
    			append_hydration_dev(ol5, t32);
    			append_hydration_dev(ol5, li18);
    			append_hydration_dev(li18, a19);
    			append_hydration_dev(a19, t33);
    			append_hydration_dev(ol5, t34);
    			append_hydration_dev(ol5, li19);
    			append_hydration_dev(li19, a20);
    			append_hydration_dev(a20, t35);
    			append_hydration_dev(ol5, t36);
    			append_hydration_dev(ol5, li20);
    			append_hydration_dev(li20, a21);
    			append_hydration_dev(a21, t37);
    			append_hydration_dev(ol5, t38);
    			append_hydration_dev(ol5, li23);
    			append_hydration_dev(li23, a22);
    			append_hydration_dev(a22, t39);
    			append_hydration_dev(li23, ol4);
    			append_hydration_dev(ol4, li21);
    			append_hydration_dev(li21, a23);
    			append_hydration_dev(a23, t40);
    			append_hydration_dev(ol4, t41);
    			append_hydration_dev(ol4, li22);
    			append_hydration_dev(li22, a24);
    			append_hydration_dev(a24, t42);
    			append_hydration_dev(ol5, t43);
    			append_hydration_dev(ol5, li24);
    			append_hydration_dev(li24, a25);
    			append_hydration_dev(a25, t44);
    			append_hydration_dev(ol8, t45);
    			append_hydration_dev(ol8, li28);
    			append_hydration_dev(li28, a26);
    			append_hydration_dev(a26, t46);
    			append_hydration_dev(li28, ol6);
    			append_hydration_dev(ol6, li26);
    			append_hydration_dev(li26, a27);
    			append_hydration_dev(a27, t47);
    			append_hydration_dev(ol6, t48);
    			append_hydration_dev(ol6, li27);
    			append_hydration_dev(li27, a28);
    			append_hydration_dev(a28, t49);
    			append_hydration_dev(ol8, t50);
    			append_hydration_dev(ol8, li32);
    			append_hydration_dev(li32, a29);
    			append_hydration_dev(a29, t51);
    			append_hydration_dev(li32, ol7);
    			append_hydration_dev(ol7, li29);
    			append_hydration_dev(li29, a30);
    			append_hydration_dev(a30, t52);
    			append_hydration_dev(ol7, t53);
    			append_hydration_dev(ol7, li30);
    			append_hydration_dev(li30, a31);
    			append_hydration_dev(a31, t54);
    			append_hydration_dev(ol7, t55);
    			append_hydration_dev(ol7, li31);
    			append_hydration_dev(li31, a32);
    			append_hydration_dev(a32, t56);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ol8);
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

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Table', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/docs/Docs.svelte generated by Svelte v3.42.5 */
    const file$1 = "src/docs/Docs.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let section0;
    	let table;
    	let t1;
    	let section1;
    	let content;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	table = new Table({ $$inline: true });
    	content = new Content({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			section0 = element("section");
    			create_component(table.$$.fragment);
    			t1 = space();
    			section1 = element("section");
    			create_component(content.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", { class: true });
    			var main_nodes = children(main);
    			claim_component(navbar.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			section0 = claim_element(main_nodes, "SECTION", { class: true });
    			var section0_nodes = children(section0);
    			claim_component(table.$$.fragment, section0_nodes);
    			section0_nodes.forEach(detach_dev);
    			t1 = claim_space(main_nodes);
    			section1 = claim_element(main_nodes, "SECTION", { class: true });
    			var section1_nodes = children(section1);
    			claim_component(content.$$.fragment, section1_nodes);
    			section1_nodes.forEach(detach_dev);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(section0, "class", "svelte-upgt5w");
    			add_location(section0, file$1, 9, 2, 169);
    			attr_dev(section1, "class", "svelte-upgt5w");
    			add_location(section1, file$1, 12, 2, 208);
    			attr_dev(main, "class", "svelte-upgt5w");
    			add_location(main, file$1, 6, 0, 146);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_hydration_dev(main, t0);
    			append_hydration_dev(main, section0);
    			mount_component(table, section0, null);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, section1);
    			mount_component(content, section1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(table.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(table.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(table);
    			destroy_component(content);
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
    	validate_slots('Docs', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Docs> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Navbar, Content, Table });
    	return [];
    }

    class Docs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Docs",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.5 */
    const file = "src/App.svelte";

    // (10:0) <Router url="{url}">
    function create_default_slot(ctx) {
    	let div;
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let current;

    	route0 = new Route({
    			props: { path: "editor", component: WebEditor },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "/docs", component: Docs },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", {});
    			var div_nodes = children(div);
    			claim_component(route0.$$.fragment, div_nodes);
    			t0 = claim_space(div_nodes);
    			claim_component(route1.$$.fragment, div_nodes);
    			t1 = claim_space(div_nodes);
    			claim_component(route2.$$.fragment, div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(div, file, 10, 2, 252);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			mount_component(route0, div, null);
    			append_hydration_dev(div, t0);
    			mount_component(route1, div, null);
    			append_hydration_dev(div, t1);
    			mount_component(route2, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(10:0) <Router url=\\\"{url}\\\">",
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

    	$$self.$capture_state = () => ({
    		Router,
    		Route,
    		WebEditor,
    		Home,
    		Docs,
    		url
    	});

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
