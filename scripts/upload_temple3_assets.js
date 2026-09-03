const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../config/db');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadAssets() {
  const assetDir = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/Components/Assets/temple');
  const files = ['01.png', '02.jpeg', '03.jpeg', '04.jpeg', '05.jpeg'];
  const uploadedUrls = [];

  for (const fileName of files) {
    const filePath = path.join(assetDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath);
    const contentType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const key = `temple/gallery/${Date.now()}-${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType
      });
      await s3.send(command);
      const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      console.log(`Uploaded ${fileName} to: ${url}`);
      uploadedUrls.push(url);
    } catch (err) {
      console.error(`Error uploading ${fileName}:`, err.message);
    }
  }

  if (uploadedUrls.length > 0) {
    await db.query(`UPDATE temple SET image = ?, gallery_images = ? WHERE id = 3`, [
      uploadedUrls[0],
      JSON.stringify(uploadedUrls)
    ]);
    console.log("Updated Temple 3 with S3 gallery URLs successfully!");
  }

  process.exit(0);
}

uploadAssets().catch(err => {
  console.error("Upload error:", err);
  process.exit(1);
});


