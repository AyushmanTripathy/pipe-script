<script>
  import Navbar from '../util/Navbar.svelte';
</script>

<main>
  <Navbar/>
  <h1>Home Page</h1>
</main>

<style lang="scss">
  @import '../mixins.scss';

  main {
    @include absolute;
    @include fullscreen;
    @include flex(column);
    @include center;

    background-color:var(--bg);
    color:var(--sec);
  }
</style>
