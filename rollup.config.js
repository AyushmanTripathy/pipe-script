import { uglify } from 'rollup-plugin-uglify'

export default {
    input: 'src/cli_build.js',
    output: {
      banner:'#! /usr/bin/env node',
        file: 'build/pipescript.js',
    },
  plugins:[
    uglify()
  ]
}
