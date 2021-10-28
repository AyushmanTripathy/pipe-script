#!/bin/sh

echo '1. update docs'
echo '2. reflected changes in todo.txt'
echo '3. update autocompletions'
echo 'confirm pusblish?'
read null

# building files
cd ~/pipe-script

# compiling docs
sh docs/compile.sh || exit

echo "building interpreter"
npm run buildi || exit

echo 'building compiler'
npm run buildc || exit

echo 'TESTING'
sh test.sh || exit

echo "building website"

cd website
npm run build || exit
cd ..

# commit to git

git add .
git commit -m 'publishing'

# publishing
npm version minor || exit

echo "publishing"
npm publish || exit

# pushing to master
git push origin master || exit

echo "merging master --> release"

curl \
  -X POST \
  -u "AyushmanTripathy":$(cat ~/.pat/git) \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/AyushmanTripathy/pipe-script/merges" \
  -d '{"base":"release","head":"master"}' | exit
echo "merge complete"

echo 'successfully published'
