const fs = require('fs');
const path = require('path');

const templePath = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/Components/temple/temple.jsx');
let content = fs.readFileSync(templePath, 'utf8');

// Fix rupee symbol and location fallback
content = content.replace(/<div className="temple-price">.*?<\/div>/, '<div className="temple-price">₹ {temple.price}</div>');
content = content.replace(
  '<p className="temple-description">{temple.location}</p>',
  '<p className="temple-description">{temple.location || temple.description || "Holy Shrine"}</p>'
);

fs.writeFileSync(templePath, content, 'utf8');
console.log("temple.jsx updated successfully!");
