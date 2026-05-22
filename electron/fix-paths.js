// Rewrite absolute paths in dist/ to relative ones
// so Electron can load it with loadFile() without a local server.
const fs = require('fs');
const path = require('path');
const glob = require('fs');

// Patch index.html: src="/_expo/..." → src="_expo/..."
const indexPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/(src|href)="\//g, '$1="');
fs.writeFileSync(indexPath, html);
console.log('Patched dist/index.html paths to relative.');

// Patch the JS bundle: "/assets/..." → "./assets/..." for font and asset paths
const jsDir = path.join(__dirname, '../dist/_expo/static/js/web');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  let js = fs.readFileSync(filePath, 'utf8');
  // Replace leading "/" in string literals that point to /assets/
  js = js.replace(/"\/assets\//g, '"./assets/');
  fs.writeFileSync(filePath, js);
  console.log(`Patched ${file} asset paths to relative.`);
}
