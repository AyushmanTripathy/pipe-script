compile(){
  markdown $1 >> output.html
}

echo '' > output.html

compile ./concepts.md
compile ./data_types.md
compile ./commands.md
compile ./conditional_flow.md
compile ./iteration.md
