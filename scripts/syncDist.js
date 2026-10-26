import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // 1. Sync compiled assets to root assets
  copyDir('dist/assets', 'assets');

  // 2. Sync public data & icons to root
  copyDir('public/data', 'data');
  if (fs.existsSync('public/icon-192.svg')) fs.copyFileSync('public/icon-192.svg', 'icon-192.svg');
  if (fs.existsSync('public/icon-512.svg')) fs.copyFileSync('public/icon-512.svg', 'icon-512.svg');

  // 3. Ensure dist has index.html and public assets
  if (fs.existsSync('index.html')) fs.copyFileSync('index.html', 'dist/index.html');
  copyDir('public/data', 'dist/data');
  if (fs.existsSync('public/icon-192.svg')) fs.copyFileSync('public/icon-192.svg', 'dist/icon-192.svg');
  if (fs.existsSync('public/icon-512.svg')) fs.copyFileSync('public/icon-512.svg', 'dist/icon-512.svg');

  // 4. Sync full dist into docs for GitHub Pages /docs option
  if (fs.existsSync('docs')) {
    fs.rmSync('docs', { recursive: true, force: true });
  }
  copyDir('dist', 'docs');

  console.log('Successfully synced dist to root assets, data, and docs.');
} catch (err) {
  console.warn('Sync dist error:', err);
}
