compile(){
  markdown $1 >> website/src/docs/Content.svelte
}

echo 'compiling Table.svelte'
markdown docs/table_of_content.md > website/src/docs/Table.svelte 

echo 'compiling Content.svelte'
echo '' > website/src/docs/Content.svelte

compile docs/concepts.md
compile docs/data_types.md
compile docs/commands.md
compile docs/conditional_flow.md
compile docs/iteration.md
