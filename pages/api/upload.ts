import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import { IncomingForm } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Configure AWS with debug logging
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  logger: console
})

const s3 = new AWS.S3()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Starting file upload process...')

    // Create upload directory if it doesn't exist
    const uploadDir = '/tmp'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
          return
        }
        resolve([fields, files])
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) {
      throw new Error('No file uploaded')
    }

    console.log('File received:', {
      name: file.originalFilename,
      type: file.mimetype,
      size: file.size
    })

    const fileContent = fs.readFileSync(file.filepath)

    const key = `posts/${Date.now()}-${file.originalFilename || 'untitled'}`
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }

    const uploadResult = await s3.upload(params).promise()
    console.log('S3 upload successful:', uploadResult)

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath)
    } catch (err) {
      console.error('Failed to clean up temp file:', err)
    }

    res.status(200).json({ 
      url: uploadResult.Location,
      success: true 
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message || 'Unknown error',
      success: false 
    })
  }
} 