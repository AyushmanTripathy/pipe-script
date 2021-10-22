<script>
  import Navbar from "../util/Navbar.svelte";
  import Content from "./Content.svelte";
  import Table from "./Table.svelte";
</script>

<main>
  <Navbar />

  <section>
    <Table />
  </section>
  <section>
    <Content />
  </section>
</main>

<style lang="scss">
  @import "../mixins.scss";

  main {
    @include page;
    display: grid;

    grid-template-columns: 1fr 3fr;
    grid-template-rows: auto;
    column-gap: 2vw;
    overflow-y: hidden;
  }
  section {
    overflow-y: scroll;
  }
</style>
