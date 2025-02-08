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
  signatureVersion: 'v4'
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create form parser
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
    })

    // Parse form with Promise wrapper
    const formData = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

    const file = formData.files.file as unknown as File
    if (!file) {
      throw new Error('No file uploaded')
    }

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