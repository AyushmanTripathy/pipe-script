<script context="module">
  import { CodeJar } from "codejar";
  import execute from "../psre.js";

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
        if (ctrlKey) execute(text.split("\n"));
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
    return saved_text ? saved_text : "";
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
    border: 1px solid var(--sec);
  }

  div {
    height: 90%;
    width: 95%;
    outline: none;
  }
</style>
