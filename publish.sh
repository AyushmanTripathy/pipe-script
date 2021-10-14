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

# merging release branch
echo "merging master --> release"
curl \
  -X POST \
  -u "AyushmanTripathy":$(cat ~/.pat) \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/AyushmanTripathy/pipe-script/merges" \
  -d '{"base":"release","head":"master"}'
echo "merge complete"

git commit -am "published $(npm view psre version)"
echo 'successfully published'
