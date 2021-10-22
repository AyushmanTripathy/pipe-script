compile(){
  markdown $1 >> ../website/src/docs/Content.svelte
}

echo 'compiling Table.svelte'
markdown ./table_of_content.md > ../website/src/docs/Table.svelte 

echo 'compiling Content.svelte'
echo '' > ../website/src/docs/Content.svelte

compile ./concepts.md
compile ./data_types.md
compile ./commands.md
compile ./conditional_flow.md
compile ./iteration.md
