git add .
git commit -m 'publishing'

cd ~/pipe-script

echo "building interpreter"
npm run int-build

echo 'building compiler'
npm run com-build

echo "build online_editor"
cd online_editor
npm run build
cd ..

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
