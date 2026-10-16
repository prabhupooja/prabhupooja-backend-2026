const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgpm2pekw',
  api_key: process.env.CLOUDINARY_API_KEY || '651761457241218',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'T4kfDnTMcBg2QyCi-CpIpHuTsJ4',
});

/**
 * Creates a Multer upload instance configured for Cloudinary
 * Automatically attaches `file.location = file.path` for 100% backwards compatibility with controllers.
 * 
 * @param {string} folderName - Subfolder in Cloudinary (e.g. 'products', 'banners', 'pandit')
 * @param {Array<string>} allowedFormats - Array of allowed file extensions
 */
const createCloudinaryUpload = (folderName = 'general', allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'webm']) => {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `prabhupooja/${folderName}`,
      allowed_formats: allowedFormats,
      public_id: (req, file) => {
        const cleanName = (file.originalname || 'file')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/\.[^/.]+$/, '').substring(0, 40);
        return `${Date.now()}-${cleanName}`;
      },
    },
  });

  const multerInstance = multer({ storage: storage });

  const wrapMiddleware = (multerFn) => (req, res, next) => {
    multerFn(req, res, (err) => {
      if (err) {
        console.error(`[Cloudinary Upload Error - ${folderName}]:`, err.message);
        return res.status(500).json({
          success: false,
          message: 'Image upload failed. Please verify image format and size.',
          error: err.message,
        });
      }

      // Backward compatibility: Set location = path so existing S3 code doesn't break
      if (req.file) {
        req.file.location = req.file.path || req.file.secure_url;
      }
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((f) => {
            f.location = f.path || f.secure_url;
          });
        } else if (typeof req.files === 'object') {
          Object.keys(req.files).forEach((key) => {
            if (Array.isArray(req.files[key])) {
              req.files[key].forEach((f) => {
                f.location = f.path || f.secure_url;
              });
            }
          });
        }
      }
      next();
    });
  };

  return {
    single: (fieldName) => wrapMiddleware(multerInstance.single(fieldName)),
    array: (fieldName, maxCount) => wrapMiddleware(multerInstance.array(fieldName, maxCount)),
    fields: (fields) => wrapMiddleware(multerInstance.fields(fields)),
    any: () => wrapMiddleware(multerInstance.any()),
    none: () => wrapMiddleware(multerInstance.none()),
    multer: multerInstance,
  };
};

module.exports = {
  cloudinary,
  createCloudinaryUpload,
};
