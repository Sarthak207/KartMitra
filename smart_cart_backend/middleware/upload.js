// middleware/upload.js - File Upload Configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
}

// Storage configuration for product images
const productImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productsDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
};

// File filter for CSV
const csvFileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
    }
};

// Upload configurations
const uploadProductImage = multer({
    storage: productImageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const uploadCSV = multer({
    dest: path.join(uploadsDir, 'temp'),
    fileFilter: csvFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for CSV
    }
});

// Multiple files upload for bulk product creation
const uploadMultipleImages = multer({
    storage: productImageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 20 // Maximum 20 files at once
    }
});

module.exports = {
    uploadProductImage,
    uploadCSV,
    uploadMultipleImages,
    uploadsDir,
    productsDir
};
