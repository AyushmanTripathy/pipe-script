cd ~/pipe-script
npm run build
echo "build pipescript.js"

cd online_editor
npm run build
echo "build online_editor"

npm version patch
echo "publishing"
npm publish
