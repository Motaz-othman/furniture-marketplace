import { uploadToCloudinary } from '../../shared/services/cloudinary.service.js';

// Upload single image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, MP4, WebM, and MOV are allowed.'
      });
    }

    // Validate file size (max 100MB for videos, 5MB for images)
    const isVideo = req.file.mimetype.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: isVideo ? 'File too large. Maximum video size is 100MB.' : 'File too large. Maximum image size is 5MB.'
      });
    }

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file, 'hero');

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
    const uploadPromises = req.files.map(file => uploadToCloudinary(file, 'products'));
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