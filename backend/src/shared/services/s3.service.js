import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadToS3 = async (file) => {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    const key = `products/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // ✅ ACL LINE REMOVED
    });

    await s3Client.send(command);

    // Return public URL
    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return url;

  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload image');
  }
};