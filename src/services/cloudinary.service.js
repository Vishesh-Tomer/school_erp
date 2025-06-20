const cloudinary = require('../lib/cloudinary');
const CONSTANT = require('../config/constant');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes TTL

const uploadImage = async (file, path) => {
  const cacheKey = `${file.originalname}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await cloudinary.uploadProfile(file, path);
    cache.set(cacheKey, result);
    return { success: true, data: result, message: 'Image uploaded successfully', code: CONSTANT.SUCCESSFUL };
  } catch (error) {
    return { success: false, data: {}, message: error.message, code: error.statusCode || CONSTANT.INTERNAL_SERVER_ERROR };
  }
};
module.exports = {
  uploadImage,
};