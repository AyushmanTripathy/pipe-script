<script>
  import Editor from './Editor.svelte'
  import Console from './Console.svelte'
</script>

<main>
  <Editor/>
  <Console />
</main>

<style>
  main { 
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 2vw;

    height: 95vh;
    width: 95vw;
  }
</style>
