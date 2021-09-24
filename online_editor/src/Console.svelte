<script>
  import { logs } from './store.js'

  let text = ''
  logs.subscribe(log =>{
    text = log
  })
</script>

<main>
  <textarea placeholder="Console" readonly bind:value={text}></textarea>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px var(--sec) solid;
  }

  textarea {
    height: 95%;
    width: 95%;

    outline: none;
    border:none;
    background-color: var(--bg);
    color: var(--sec);
  }
</style>
