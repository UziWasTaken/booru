import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import multiparty from 'multiparty'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
    // Increase max payload size
    maxBodySize: '160mb' // Match S3 console limit
  },
}

if (!process.env.AWS_BUCKET_NAME) {
  throw new Error('AWS_BUCKET_NAME environment variable is not defined')
}

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4',
  endpoint: `https://${process.env.AWS_ACCESS_POINT}.s3-accesspoint.${process.env.AWS_REGION}.amazonaws.com`
})

// Parse form data
const parseForm = (req: NextApiRequest) => {
  return new Promise<{ fields: any; files: any }>((resolve, reject) => {
    const form = new multiparty.Form({
      maxFilesSize: 160 * 1024 * 1024 // 160MB - matching S3 console limit
    })

    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the multipart form data
    const { fields, files } = await parseForm(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('File received:', {
      name: file.originalFilename,
      type: file.headers['content-type'],
      size: file.size
    })

    // Read file content
    const fileContent = await fs.promises.readFile(file.path)

    // Generate a unique key
    const timestamp = Date.now()
    const uniqueKey = `uploads/${timestamp}-${file.originalFilename}`

    // Check if object already exists
    try {
      await s3.headObject({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uniqueKey
      }).promise()

      // If we get here, object exists
      return res.status(409).json({
        success: false,
        error: 'File with this name already exists'
      })
    } catch (err: any) {
      // 404 means object doesn't exist, which is what we want
      if (err.code !== 'NotFound') {
        throw err
      }
    }

    // Choose upload method based on file size
    let uploadResult
    if (file.size > 5 * 1024 * 1024) { // 5MB
      // Use multipart upload for large files
      const multipartUpload = await s3.createMultipartUpload({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uniqueKey,
        ContentType: file.headers['content-type'],
        ACL: 'public-read',
        ServerSideEncryption: 'AES256' // Enable server-side encryption
      }).promise()

      // Implementation for multipart upload would go here
      // For now, fall back to regular upload
      uploadResult = await s3.upload({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uniqueKey,
        Body: fileContent,
        ContentType: file.headers['content-type'],
        ACL: 'public-read',
        ServerSideEncryption: 'AES256'
      }).promise()
    } else {
      // Use regular upload for small files
      uploadResult = await s3.upload({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uniqueKey,
        Body: fileContent,
        ContentType: file.headers['content-type'],
        ACL: 'public-read',
        ServerSideEncryption: 'AES256'
      }).promise()
    }

    // Clean up temp file
    await fs.promises.unlink(file.path)

    return res.status(200).json({
      success: true,
      url: uploadResult.Location,
      key: uploadResult.Key
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    
    // Handle specific S3 errors
    if (error.code === 'EntityTooLarge') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 160MB.'
      })
    }

    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
} 