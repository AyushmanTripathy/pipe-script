<script>
  import Editor from "./Editor.svelte";
  import Console from "./Console.svelte";
  import Navbar from "../util/Navbar.svelte";
</script>

<main>
  <Navbar />
  <section>
    <Editor />
    <Console />
  </section>
</main>

<style lang="scss">
  @import "../mixins.scss";

  main {
    @include page;
    @include flex(row);
    display: grid;

    background-color: var(--bg);
    color: var(--sec);
  }

  section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 2%;
  }
</style>
