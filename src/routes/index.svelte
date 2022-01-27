<script>
  import Content from "../Content.svelte";
  import Table from "../Table.svelte";
</script>

<main>
  <section class="table">
    <Table />
  </section>
  <section class="content">
    <Content />
  </section>
</main>

<style lang="scss">
  main {
    @include fullscreen;
    @include noto;
    @include absolute;
    @include grid(1fr, 1fr 3fr);

    background: $pri;
    color: $light;
  }
  section {
    overflow: auto;
    overflow-y: scroll;
  }
  .table {
    max-width: 200px;
  }
  @media screen and (max-width: $mobile) {
    main {
      grid-template-columns: 1fr;
    }
    .table {
      display: none;
    }
  }
</style>
