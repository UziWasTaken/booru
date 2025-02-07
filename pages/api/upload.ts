import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable from 'formidable'
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
    console.log('AWS Credentials:', {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID?.slice(0, 5) + '...',
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME
    })

    const form = new formidable.IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err)
          reject(err)
          return
        }
        resolve([fields, files])
      })
    })

    const file = files.file
    if (!file || Array.isArray(file)) {
      throw new Error('Invalid file upload')
    }

    console.log('File received:', {
      name: file.originalFilename,
      type: file.mimetype,
      size: file.size
    })

    // Verify file exists and is readable
    if (!fs.existsSync(file.filepath)) {
      throw new Error('Uploaded file not found in temporary storage')
    }

    const fileContent = fs.readFileSync(file.filepath)
    console.log('File content read, size:', fileContent.length)

    const key = `posts/${Date.now()}-${file.originalFilename || 'untitled'}`
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }

    console.log('Starting S3 upload with params:', {
      ...params,
      Body: `<${fileContent.length} bytes>`
    })

    const uploadResult = await s3.upload(params).promise()
    console.log('S3 upload successful:', uploadResult)

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath)
      console.log('Temporary file cleaned up')
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
      error: error.message,
      success: false 
    })
  }
} 