<script>
  import { Router, Route } from "svelte-routing";
  import WebEditor from './editor/WebEditor.svelte';
  import Home from './home/Home.svelte';

  export let url = "";
</script>

<Router url="{url}">
  <div>
    <Route path="editor" component="{WebEditor}" />
    <Route path="/" component="{Home}" />
  </div>
</Router>
