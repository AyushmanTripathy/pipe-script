<script>
  import Navbar from "../util/Navbar.svelte";
</script>

<main>
  <Navbar />
  <h1>Pipescript</h1>
  <p>A programming language that revolves around piping.</p>
  <a href="https://github.com/AyushmanTripathy/pipe-script">check the repo</a>
  <p>try it out!</p>
  <code>npm install -g pipescript-dev-kit</code>
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
    text-align: center;
  }
</style>
