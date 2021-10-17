#!/bin/sh
# building files

cd ~/pipe-script

echo "building interpreter"
npm run buildi

echo 'building compiler'
npm run buildc

echo "build online_editor"
cd web_editor
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
