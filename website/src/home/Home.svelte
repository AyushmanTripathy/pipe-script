<script>
  import Navbar from "../util/Navbar.svelte";

  let downloads = '[ loading... ]'
  async function get() {
    let response = await fetch(
      "https://api.npmjs.org/downloads/range/2021-10-1:2021-10-23/pipescript-dev-kit"
    );

    response = await response.json()
    downloads = response['downloads'].reduce((acc,cur)=> acc
    + cur['downloads'],0)
  }

  window.onload = get;
</script>

<main>
  <Navbar />
  <h1>Pipescript</h1>
  <p>A programming language that revolves around piping.</p>
  <p> {downloads} npm downloads 🎉</p>
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
