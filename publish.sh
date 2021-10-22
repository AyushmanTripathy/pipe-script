#!/bin/sh

echo '1. update docs and compile output.html'
echo '2. updated file structure in readme'
echo '3. reflected changes in todo.txt'
echo 'confirm pusblish?'
read null

# building files
#
cd ~/pipe-script

echo "building interpreter"
npm run buildi

echo 'building compiler'
npm run buildc

echo "build online_editor"
cd website
npm run build
cd ..

# commit to git

git add .
git commit -m 'publishing'

# publishing
npm version minor

echo "publishing"
npm publish

# pushing to master
git push origin master

merge-master-release

git commit -am "published $(npm view psre version)"
echo 'successfully published'
