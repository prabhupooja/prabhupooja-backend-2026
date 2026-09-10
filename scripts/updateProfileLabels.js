const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/Components/editprofile.jsx');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  content = content.replace(
    '{productOrdersList.length} Orders',
    '{productOrdersList.length === 1 ? "1 Order" : `${productOrdersList.length} Orders`}'
  );
  content = content.replace(
    '{poojaCount} Pujas',
    '{poojaCount === 1 ? "1 Puja" : `${poojaCount} Pujas`}'
  );
  content = content.replace(
    '{prasadBookingsList.length} Prasads',
    '{prasadBookingsList.length === 1 ? "1 Prasad" : `${prasadBookingsList.length} Prasads`}'
  );
  content = content.replace(
    '{templeBookingsList.length} Temples',
    '{templeBookingsList.length === 1 ? "1 Temple" : `${templeBookingsList.length} Temples`}'
  );
  content = content.replace(
    '{yogaBookingsList.length} Sessions',
    '{yogaBookingsList.length === 1 ? "1 Session" : `${yogaBookingsList.length} Sessions`}'
  );

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Updated editprofile.jsx count labels successfully.');
} else {
  console.log('File not found at:', targetFile);
}
