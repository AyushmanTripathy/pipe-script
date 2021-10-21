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
    @include absolute;
    @include flex(row);
    width:100vw;
    height: calc( 100vh - $navbar_height );

    display: grid;

    background-color: var(--bg);
    color: var(--sec);
    padding-top: $navbar_height;
  }

  section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 2%;
  }
</style>
