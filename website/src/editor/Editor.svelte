<script context="module">
  import { CodeJar } from "codejar";
  import { logs } from "../store.js";
  import execute from "../interpreter/interpreter.js";

  let text = retrive();
  let running = false;

  let code = text;
  export function codedit(
    node,
    { code, autofocus = true, loc = true, ...options }
  ) {
    const editor = CodeJar(node, () => {}, options);

    editor.onUpdate((code) => (text = code));

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
      },
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
        if (ctrlKey) execute(text,logs);
      default:
        break;
    }
  }
  function save() {
    running = false;
    localStorage.setItem("pipescript-code", JSON.stringify(text));
  }

  function retrive() {
    const saved_text = JSON.parse(localStorage.getItem("pipescript-code"));
    return saved_text ? saved_text : first_time();
  }

  function first_time () {
    alert('ctrl + enter to run!')
    localStorage.setItem("pipescript-code", JSON.stringify("log 'hello world'"));
    return "log 'hello world'";
  }
</script>

<main>
  <div
    data-gramm="false"
    spellcheck="false"
    use:codedit={{ code, $$restProps }}
    on:keydown={handleKeyPress}
  />
</main>

<style lang="scss">
  @import "../mixins.scss";

  main {
    @include center;
    padding: 10px;
  }

  div {
    height: 90%;
    width: 95%;
    outline: none;
  }
</style>
