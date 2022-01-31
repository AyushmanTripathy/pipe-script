#!/bin/sh

compile(){
  marked $1 >> website/src/content.html
}

echo 'compiling Table.svelte'
marked docs/table_of_content.md > website/src/table.html

echo 'compiling Content.svelte'
echo '' > website/src/content.html

compile docs/concepts.md
compile docs/data_types.md
compile docs/commands.md
compile docs/conditional_flow.md
compile docs/iteration.md
