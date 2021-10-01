
echo "build pipescript.js"
cd ~/pipe-script
npm run build

echo "build online_editor"
cd online_editor
npm run build
cd ..

npm version patch
echo "publishing"
npm publish

echo "pushing to github"
g
