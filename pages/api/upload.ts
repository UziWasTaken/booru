import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable, { Fields, Files, File } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

if (!process.env.AWS_BUCKET_NAME) {
  throw new Error('AWS_BUCKET_NAME environment variable is not defined')
}

// Configure AWS S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  signatureVersion: 'v4',
  endpoint: `https://${process.env.AWS_ACCESS_POINT}.s3-accesspoint.${process.env.AWS_REGION}.amazonaws.com`
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if content type is multipart
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(415).json({ error: 'Content type must be multipart/form-data' })
  }

  try {
    // Create form parser with specific options
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
      multiples: false,
      encoding: 'utf-8',
      hashAlgorithm: false,
      allowEmptyFiles: false
    })

    // Parse form with Promise wrapper
    const formData = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err)
          return reject(err)
        }
        resolve({ fields, files })
      })
    })

    const file = formData.files.file as unknown as File
    if (!file) {
      throw new Error('No file uploaded')
    }

    console.log('File received:', {
      name: file.originalFilename,
      type: file.mimetype,
      size: file.size,
      path: file.filepath
    })

    // Read file
    const fileBuffer = await fs.promises.readFile(file.filepath)

    // Upload to S3
    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `uploads/${Date.now()}-${file.originalFilename}`,
      Body: fileBuffer,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }).promise()

    // Cleanup
    await fs.promises.unlink(file.filepath)

    return res.status(200).json({
      success: true,
      url: uploadResult.Location,
      key: uploadResult.Key
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
} 