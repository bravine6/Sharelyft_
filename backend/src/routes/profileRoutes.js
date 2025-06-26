const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

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

// Profile photo routes
router.post('/photo', authMiddleware, upload.single('photo'), profileController.uploadProfilePhoto);
router.delete('/photo', authMiddleware, profileController.deleteProfilePhoto);

// Settings routes
router.get('/settings', authMiddleware, profileController.getSettings);
router.put('/settings', authMiddleware, profileController.updateSettings);

// Password change route
router.put('/change-password', authMiddleware, profileController.changePassword);

module.exports = router;