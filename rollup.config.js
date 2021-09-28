import { uglify } from 'rollup-plugin-uglify'

export default {
    input: 'src/index.js',
    output: {
      banner:'#! /usr/bin/env node',
        file: 'src/pipescript.js',
    },
  plugins:[
    uglify()
  ]
}
