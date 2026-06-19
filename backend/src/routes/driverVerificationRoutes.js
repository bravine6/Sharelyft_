const express = require('express');
const router = express.Router();
const multer = require('multer');
const driverVerificationController = require('../controllers/driverVerificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'), false);
    }
  }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
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

// Driver verification routes
router.get('/status', authMiddleware, driverVerificationController.getVerificationStatus);
router.post('/upload', authMiddleware, upload.single('document'), handleMulterError, driverVerificationController.uploadDocument);
router.delete('/document/:documentId', authMiddleware, driverVerificationController.deleteDocument);

// Admin routes for document review
router.get('/pending', authMiddleware, driverVerificationController.getPendingDocuments);
router.put('/review/:documentId', authMiddleware, driverVerificationController.reviewDocument);

module.exports = router;