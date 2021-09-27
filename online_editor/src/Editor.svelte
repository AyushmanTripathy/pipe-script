<script>
  import execute from "./psre.js";

  let text = retrive()
  let running = false

  function handleKeyPress(event) {
    if (!running) {
      running = true;
      setTimeout(save,1000)
    }

    switch (event.code) {
      case "Enter":
        if (event.ctrlKey) break;
      default:
        return;
    }

    execute(text.split("\n"));
  }

  function save() {
    running = false;
    localStorage.setItem('text',JSON.stringify(text))
  }

  function retrive() {
    const saved_text = JSON.parse(localStorage.getItem('text'))
    return saved_text ? saved_text : '';
  }
</script>

<main>
  <textarea
    placeholder="Editor"
    bind:value={text}
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
