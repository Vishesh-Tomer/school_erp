const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const sharp = require('sharp');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const uploadProfile = async (file, path) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only JPEG and PNG images are allowed');
  }
  if (file.size > maxSize) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File size must be less than 5MB');
  }

  const compressedBuffer = await sharp(file.buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: path,
        resource_type: 'image',
        format: 'jpg',
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Cloudinary Upload Error: ${error.message}`));
        } else {
          resolve({ previewUrl: result.secure_url, data: { Location: result.secure_url } });
        }
      }
    );
    uploadStream.end(compressedBuffer);
  });
};

module.exports = {
  uploadProfile,
};