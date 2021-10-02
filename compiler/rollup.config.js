import { uglify } from 'rollup-plugin-uglify'

export default {
    input: 'compiler/compiler.js',
    output: {
      format:'esm',
      banner:'#! /usr/bin/env node \n globalThis.release_mode = true',
        file: 'build/psc.js',
    },
  plugins:[
    uglify()
  ]
}
