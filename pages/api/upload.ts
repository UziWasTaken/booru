import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable, { File } from 'formidable'
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

    // Create upload directory if it doesn't exist
    const uploadDir = '/tmp'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
      allowEmptyFiles: false,
      filter: ({ mimetype }) => {
        // Accept images and videos
        return Boolean(mimetype && (mimetype.includes('image') || mimetype.includes('video')))
      },
      // This is important for parsing multipart form data
      encoding: 'utf-8',
      hashAlgorithm: false,
    })

    const formData = await new Promise<{ fields: any; files: { file: File } }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err)
          reject(err)
          return
        }
        resolve({ fields, files: files as any })
      })
    })

    const uploadedFile = formData.files.file
    if (!uploadedFile) {
      throw new Error('No file uploaded')
    }

    console.log('File received:', {
      name: uploadedFile.originalFilename,
      type: uploadedFile.mimetype,
      size: uploadedFile.size
    })

    // Verify file exists and is readable
    if (!fs.existsSync(uploadedFile.filepath)) {
      throw new Error('Uploaded file not found in temporary storage')
    }

    const fileContent = fs.readFileSync(uploadedFile.filepath)
    console.log('File content read, size:', fileContent.length)

    const key = `posts/${Date.now()}-${uploadedFile.originalFilename || 'untitled'}`
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: key,
      Body: fileContent,
      ContentType: uploadedFile.mimetype || 'application/octet-stream',
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
      fs.unlinkSync(uploadedFile.filepath)
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