git commit -am 'publishing'

echo "build pipescript.js"
cd ~/pipe-script
npm run build

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
  -u "AyushmanTripathy":$(cat ~/.pat)
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/AyushmanTripathy/pipe-script/merges" \
  -d "$(cat publish_options.json)" 
echo "merge complete"

git commit -am "published $(npm view psre version)"
echo 'successfully published'
