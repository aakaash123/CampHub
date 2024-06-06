const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dt2brrqkz',
  api_key: '888291185141348',
  api_secret: 'R5P4obxDsBU_H_fuSN_7VAtmYc0'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campgrounds',
    allowedFormats: ['jpeg', 'png', 'jpg']
  }
});

const upload = multer({ storage });

module.exports = {
  cloudinary,
  upload
};