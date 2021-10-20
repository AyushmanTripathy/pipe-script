<script>
  import { link } from "svelte-routing";
</script>

<main>
  <a href="/" use:link>Home</a>
  <a href="/editor" use:link>Editor</a>
</main>

<style lang="scss">
  @import "../mixins.scss";

  main {
    @include fixed;
    @include flex(row);
    justify-content: end;
    align-items: center;

    height: calc($navbar_height - 2vh);
    width: 100vw;
    margin-top: 2vh;
    background: transparent;
  }

  a {
    text-decoration: none;
    color: var(--sec);

    margin-right: 2vw;
    cursor: pointer;

    &:hover {
      color: var(--hl);
    }
  }
</style>
