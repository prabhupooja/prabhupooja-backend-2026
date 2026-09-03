const fs = require('fs');
const path = require('path');

const appJsPath = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/App.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Add TempleDetail lazy import if not present
if (!appJsContent.includes('const TempleDetail = lazy')) {
  appJsContent = appJsContent.replace(
    'const Temple = lazy(() => import("./Components/temple/temple"));',
    `const Temple = lazy(() => import("./Components/temple/temple"));
const TempleDetail = lazy(() => import("./Components/temple/TempleDetail"));`
  );
}

// Update routes
const oldRoutes = `<Route path="/temple" element={<Temple />} />
            <Route path="/booknowform" element={<Booknowform />} />
            <Route path="/temple/1" element={<Khajranatemple />} />
            <Route path="/temple/2" element={<Ujjaintemple />} />
            <Route path="/temple/3" element={<PanchmukhiShaniHanumanMandir />} />`;

const newRoutes = `<Route path="/temple" element={<Temple />} />
            <Route path="/booknowform" element={<Booknowform />} />
            <Route path="/temple/:id" element={<TempleDetail />} />
            <Route path="/temple/1" element={<TempleDetail />} />
            <Route path="/temple/2" element={<TempleDetail />} />
            <Route path="/temple/3" element={<TempleDetail />} />`;

if (appJsContent.includes(oldRoutes)) {
  appJsContent = appJsContent.replace(oldRoutes, newRoutes);
} else {
  // Regex fallback
  const regexRoutes = /<Route path="\/temple" element={<Temple \/>} \/>[\s\S]*?<Route path="\/temple\/3" element={<PanchmukhiShaniHanumanMandir \/>} \/>/;
  appJsContent = appJsContent.replace(regexRoutes, newRoutes);
}

fs.writeFileSync(appJsPath, appJsContent, 'utf8');
console.log("App.js updated with dynamic TempleDetail route successfully!");
