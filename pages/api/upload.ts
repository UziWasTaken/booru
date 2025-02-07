import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable, { File } from 'formidable'
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
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
})

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

    const options: formidable.Options = {
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
      filename: (_name, _ext, part) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        return `${uniqueSuffix}-${part.originalFilename}`
      },
      filter: (part) => {
        return part.name === 'file' && (part.mimetype?.includes('image/') || part.mimetype?.includes('video/')) || false
      }
    }

    const form = formidable(options)

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files<File>]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
          return
        }
        resolve([fields, files])
      })
    })

    const uploadedFile = files.file as File
    if (!uploadedFile) {
      throw new Error('Invalid file upload')
    }

    console.log('File received:', {
      name: uploadedFile.originalFilename,
      type: uploadedFile.mimetype,
      size: uploadedFile.size
    })

    const fileContent = fs.readFileSync(uploadedFile.filepath)

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `posts/${uploadedFile.newFilename || uploadedFile.originalFilename}`,
      Body: fileContent,
      ContentType: uploadedFile.mimetype || 'application/octet-stream',
      ACL: 'public-read',
      Metadata: {
        'original-name': uploadedFile.originalFilename || 'untitled',
        'upload-date': new Date().toISOString(),
        'content-type': uploadedFile.mimetype || 'application/octet-stream'
      }
    }

    console.log('Uploading to S3...')
    const uploadResult = await s3.upload(uploadParams).promise()
    console.log('S3 upload successful:', uploadResult)

    try {
      fs.unlinkSync(uploadedFile.filepath)
      console.log('Temporary file cleaned up')
    } catch (err) {
      console.error('Failed to clean up temp file:', err)
    }

    res.status(200).json({ 
      url: uploadResult.Location,
      key: uploadResult.Key,
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