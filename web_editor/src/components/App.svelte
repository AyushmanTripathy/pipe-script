<script>
  import Editor from "./Editor.svelte";
  import Console from "./Console.svelte";
</script>

<main>
  <section>
    <Editor />
    <Console />
  </section>
</main>

<style lang="scss">
  @import "src/mixins.scss";

  main {
    @include absolute;
    @include fullscreen;
    @include flex(row);

    display:grid;

    background-color: var(--bg);
    color: var(--sec);
  }

  section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 2%;
  }
</style>
