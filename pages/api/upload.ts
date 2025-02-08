import { NextApiRequest, NextApiResponse } from 'next'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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

// Configure S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
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

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueKey,
      Body: fileContent,
      ContentType: file.headers['content-type'],
      ACL: 'public-read'
    })

    const response = await s3Client.send(command)
    console.log('Upload successful:', response)

    // Clean up temp file
    await fs.promises.unlink(file.path)

    // Construct the URL
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`

    return res.status(200).json({
      success: true,
      url,
      key: uniqueKey
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    
    // Handle specific S3 errors
    if (error.name === 'EntityTooLarge') {
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