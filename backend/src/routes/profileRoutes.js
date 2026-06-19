const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  }
});

// Profile routes
router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB' });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ message: 'Too many files. Only one file allowed' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ message: 'Unexpected file field' });
      default:
        return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
  } else if (err) {
    // Handle other file filter errors
    return res.status(400).json({ message: err.message });
  }
  next();
};

// Profile photo routes
router.post('/photo', authMiddleware, upload.single('photo'), handleMulterError, profileController.uploadProfilePhoto);
router.delete('/photo', authMiddleware, profileController.deleteProfilePhoto);

// Settings routes
router.get('/settings', authMiddleware, profileController.getSettings);
router.put('/settings', authMiddleware, profileController.updateSettings);

// Password change route
router.put('/change-password', authMiddleware, profileController.changePassword);

module.exports = router;