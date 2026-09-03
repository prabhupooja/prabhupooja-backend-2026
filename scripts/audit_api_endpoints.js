const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(getFiles(file));
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

function scanEndpoints(srcDir, label) {
  const files = getFiles(srcDir);
  const endpoints = [];
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const relPath = path.relative(srcDir, f);
    // match api.get('/...', axios.post('/...', etc.
    const regex = /(?:api|axios)\.(get|post|put|delete|patch)\(\s*[`'"]([^`'"]+)[`'"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        url: match[2],
        file: relPath
      });
    }
  });
  console.log(`=== ${label} Endpoints (${endpoints.length}) ===`);
  const unique = new Map();
  endpoints.forEach(e => {
    const key = `${e.method} ${e.url.split('?')[0]}`;
    if (!unique.has(key)) {
      unique.set(key, []);
    }
    unique.get(key).push(e.file);
  });

  Array.from(unique.keys()).sort().forEach(k => {
    console.log(`${k} -> used in ${unique.get(k).length} place(s): ${unique.get(k).slice(0, 2).join(', ')}`);
  });
  return unique;
}

console.log("Auditing Admin Panel & Frontend API Endpoints...\n");
const adminEndpoints = scanEndpoints(path.resolve(__dirname, '../../Admin-PrabhuPooja/src'), 'ADMIN PANEL');
console.log("\n");
const frontendEndpoints = scanEndpoints(path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src'), 'USER FRONTEND');

process.exit(0);
