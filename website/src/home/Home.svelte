<script>
  import Navbar from "../util/Navbar.svelte";
</script>

<main>
  <Navbar />
  <h1>Pipescript</h1>
  <p>A programming language that revolves around piping.</p>
  <p>home page is still in development</p>
</main>

<style lang="scss">
  @import "../mixins.scss";

  main {
    @include absolute;
    @include fullscreen;
    @include flex(column);
    @include center;

    background-color: var(--bg);
    color: var(--sec);
  }
</style>
