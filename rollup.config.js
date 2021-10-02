import { uglify } from 'rollup-plugin-uglify'

export default {
    input: 'src/interpreter.js',
    output: {
      format:'esm',
      banner:'#! /usr/bin/env node \n globalThis.release_mode = true',
        file: 'build/pipescript.js',
    },
  plugins:[
    uglify()
  ]
}
