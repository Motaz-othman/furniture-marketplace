'use client';

import { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';
import { uploadService } from '@/lib/api/upload.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImageUploader({ images, setImages, maxImages = 10 }) {
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isMainImage, setIsMainImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const optimizeImage = async (file) => {
    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.85,
      };

      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Image optimization error:', error);
      return file;
    }
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      img.src = url;
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // First image must be cropped to square
    if (images.length === 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentImage({
          src: e.target.result,
          file: file,
          name: file.name,
        });
        setIsMainImage(true);
        setCrop({ unit: '%', width: 90, aspect: 1 }); // Square crop
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
      
      // Process remaining files without crop
      if (files.length > 1) {
        processFiles(files.slice(1), false);
      }
    } else {
      // Additional images - optional crop
      processFiles(files, false);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files, requireCrop) => {
    if (requireCrop && files.length > 0) {
      // Show crop dialog
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentImage({
          src: e.target.result,
          file: file,
          name: file.name,
        });
        setIsMainImage(false);
        setCrop({ unit: '%', width: 90, aspect: undefined }); // Free crop
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Upload without crop
    setUploading(true);
    setOptimizing(true);

    for (const file of files) {
      try {
        // Get original dimensions
        const dims = await getImageDimensions(file);
        
        // Optimize
        const optimizedFile = await optimizeImage(file);
        const optimizedDims = await getImageDimensions(optimizedFile);
        
        // Upload
        setOptimizing(false);
        const result = await uploadService.uploadSingle(optimizedFile);
        
        // Add to images array
        setImages(prev => [...prev, {
          url: result.url,
          originalDimensions: dims,
          optimizedDimensions: optimizedDims,
          size: (optimizedFile.size / 1024 / 1024).toFixed(2),
          name: file.name,
        }]);
        
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setOptimizing(false);
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current || !currentImage) return;

    setUploading(true);
    setOptimizing(true);

    try {
      // Create canvas with crop
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      const croppedFile = new File([blob], currentImage.name, {
        type: 'image/jpeg',
      });

      // Get dimensions
      const dims = await getImageDimensions(croppedFile);

      // Optimize
      const optimizedFile = await optimizeImage(croppedFile);
      const optimizedDims = await getImageDimensions(optimizedFile);

      // Upload
      setOptimizing(false);
      const result = await uploadService.uploadSingle(optimizedFile);

      // Add to images array
      setImages(prev => [...prev, {
        url: result.url,
        originalDimensions: dims,
        optimizedDimensions: optimizedDims,
        size: (optimizedFile.size / 1024 / 1024).toFixed(2),
        name: currentImage.name,
        isMain: isMainImage,
      }]);

      toast.success('Image uploaded successfully');
      setCropDialogOpen(false);
      setCurrentImage(null);
    } catch (error) {
      console.error('Crop/upload error:', error);
      toast.error('Failed to process image');
    } finally {
      setUploading(false);
      setOptimizing(false);
    }
  };

  const handleSkipCrop = () => {
    if (!currentImage) return;
    processFiles([currentImage.file], false);
    setCropDialogOpen(false);
    setCurrentImage(null);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-gray-300 hover:border-gray-400"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {uploading ? 'Uploading...' : 'Click to upload images'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {images.length === 0 
            ? 'First image will be your main listing image (square crop required)'
            : `Additional images (${images.length}/${maxImages})`
          }
        </p>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              
              {/* Main image badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  Main
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image info */}
              <div className="mt-1 text-xs text-gray-600">
                <p className="flex items-center gap-1">
                  {image.optimizedDimensions?.width}x{image.optimizedDimensions?.height}
                  <span>•</span>
                  {image.size} MB
                  {image.originalDimensions && 
                   (image.originalDimensions.width !== image.optimizedDimensions?.width) && (
                    <Check className="h-3 w-3 text-green-600 ml-1" title="Optimized" />
                  )}
                </p>
              </div>

              {/* Low quality warning */}
              {image.optimizedDimensions?.width < 1000 && (
                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Low resolution</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isMainImage ? 'Crop Main Image (Square Required)' : 'Crop Image (Optional)'}
            </DialogTitle>
            <DialogDescription>
              {isMainImage 
                ? 'This image will appear in product listings. Square crop is required for consistency.'
                : 'Adjust the crop area or skip to use the full image.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentImage && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={isMainImage ? 1 : undefined}
              >
                <img
                  ref={imgRef}
                  src={currentImage.src}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh' }}
                />
              </ReactCrop>
            )}

            {optimizing && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimizing image...
              </div>
            )}
          </div>

          <DialogFooter>
            {!isMainImage && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipCrop}
                disabled={uploading}
              >
                Skip Crop
              </Button>
            )}
            <Button
              type="button"
              onClick={handleCropComplete}
              disabled={uploading || !completedCrop}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {optimizing ? 'Optimizing...' : 'Uploading...'}
                </>
              ) : (
                'Crop & Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}