#!/bin/sh

error () {
  echo $1
  exit 1
}

interpreted_output=$(pipescript test.pipescript || error "interpreter failed!")
psc test.pipescript test.js >> /dev/null || error 'compiler failed!'
compiled_output=$(node test.js || error "node failed to run test.js")

if [ $interpreted_output = $compiled_output ]
then
  echo 'test passing!'
else
   echo 'unmatching outputs'
   echo '## interpreted output ##'
   echo $interpreted_output
   echo '## compiled output ##'
   echo $compiled_output
   exit 1
fi
