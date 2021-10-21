# Pipe Script

A programming language that revolves around piping.

Pipescript is functional, high-level, interpreted/compiled, indented, single threaded,dynamically typed programming language.

Pipescript can be interpreted directly or be compiled into javascript.

##### core concepts

1. piping
2. command for every thing (call,set,log,etc..)
3. code blocks

check [DOCS](./docs/index.md) to know more

#### check it out

1. install pipe scipt development kit from npm `sudo npm install -g pipescript-dev-kit` which comes with pipescript interpreter (command - pipescript) and pipescript compiler (command - psc)
2. or vist pipe scipt's [web editor](https://pipescript.netlify.app/) <br/>
   status of webeditor - [![Netlify Status](https://api.netlify.com/api/v1/badges/a22b7a82-8fd8-4f28-9ee8-af363696dc29/deploy-status)](https://app.netlify.com/sites/pipescript/deploys)

<details>
<summary>File Structure</summary>
<br>

├── build\
│   ├── pipescript.js\
│   └── psc.js\
├── common\
│   ├── process.js\
│   └── util.js\
├── compiler\
│   ├── compilation.js\
│   ├── compiler.js\
│   └── rollup.config.js\
├── config.json\
├── examples\
│   ├── diamond.pipescript\
│   ├── even_num.pipescript\
│   ├── factorial.pipescript\
│   └── fibonnaci.pipescript\
├── interpreter\
│   ├── execution.js\
│   ├── interpreter.js\
│   ├── rollup.config.js\
│   └── structure.txt\
├── LICENSE\
├── nodemon.json\
├── package.json\
├── publish.sh\
├── README.md\
├── SYNTAX.md\
├── test.js\
├── test.pipescript\
├── todo.txt

</details>
