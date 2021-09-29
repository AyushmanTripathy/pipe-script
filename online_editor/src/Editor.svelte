<script>
  import execute from "./psre.js";

  let textarea;

  let text = retrive();
  let running = false;

  window.addEventListener("keydown", (event) => {
    switch (event.code) {
      case "Tab":
        event.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // set textarea alue to: text before caret + tab + text after caret
        text = text.substring(0, start) + "  " + text.substring(end);

        // put caret at right position again
        textarea.focus();
        textarea.selectionEnd = start + 2;

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
      default:
        break;
    }
  }

  function save() {
    running = false;
    localStorage.setItem("text", JSON.stringify(text));
  }

  function retrive() {
    const saved_text = JSON.parse(localStorage.getItem("text"));
    return saved_text ? saved_text : "";
  }
</script>

<main>
  <textarea
    id="editor"
    placeholder="Editor"
    bind:value={text}
    bind:this={textarea}
    on:keypress={handleKeyPress}
    spellcheck="true"
    contenteditable
  />
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;

    padding: 10px;
    border: 1px solid var(--sec);
  }

  textarea {
    background-color: var(--bg);
    color: var(--sec);

    border: none;
    outline: none;
    padding: 2%;
    height: 95%;
    width: 95%;
  }
</style>
