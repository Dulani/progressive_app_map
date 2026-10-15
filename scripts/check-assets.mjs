// Fails if the manifest or service worker reference local files that don't exist,
// or if a local path is absolute (absolute paths break under the GitHub Pages subpath).
import { readFileSync, existsSync } from 'node:fs';

const errors = [];

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
for (const icon of manifest.icons || []) {
    if (!existsSync(icon.src)) errors.push(`manifest.json icon not found: ${icon.src}`);
}

const sw = readFileSync('service-worker.js', 'utf8');
const shellList = sw.match(/SHELL_ASSETS = \[([\s\S]*?)\]/);
if (!shellList) errors.push('Could not find SHELL_ASSETS in service-worker.js');
for (const [, path] of (shellList ? shellList[1] : '').matchAll(/'([^']+)'/g)) {
    if (path.startsWith('http')) continue;
    if (path.startsWith('/')) errors.push(`Absolute path in SHELL_ASSETS (breaks on GitHub Pages): ${path}`);
    const file = path === './' ? 'index.html' : path.replace(/^\.\//, '');
    if (!existsSync(file)) errors.push(`SHELL_ASSETS file not found: ${path}`);
}

const script = readFileSync('script.js', 'utf8');
if (/serviceWorker\.register\(\s*['"]\//.test(script)) {
    errors.push('Service worker registered with an absolute path (breaks on GitHub Pages)');
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log('Asset check passed.');
