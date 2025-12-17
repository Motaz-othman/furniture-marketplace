import { uploadToS3 } from '../../shared/services/s3.service.js';

// Upload single image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }

    // Upload to S3
    const imageUrl = await uploadToS3(req.file);

    res.json({
      message: 'Image uploaded successfully',
      url: imageUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

// Upload multiple images (for products)
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Validate max 10 images
    if (req.files.length > 10) {
      return res.status(400).json({ 
        error: 'Maximum 10 images allowed' 
      });
    }

    // Upload all images
    const uploadPromises = req.files.map(file => uploadToS3(file));
    const imageUrls = await Promise.all(uploadPromises);

    res.json({
      message: 'Images uploaded successfully',
      urls: imageUrls
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};