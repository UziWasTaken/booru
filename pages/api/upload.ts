import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable, { Fields, Files } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
})

interface FormidableFile {
  filepath: string
  originalFilename: string
  mimetype: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true,
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Accept images and videos
        return mimetype && (mimetype.includes('image') || mimetype.includes('video'))
      }
    })
    
    const parseData: [Fields, Files] = await new Promise((resolve, reject) => {
      try {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('Form parse error:', err)
            reject(err)
            return
          }
          resolve([fields, files])
        })
      } catch (e) {
        console.error('Form parse exception:', e)
        reject(e)
      }
    })

    const files = parseData[1]
    
    if (!files.file) {
      throw new Error('No file uploaded')
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    if (!uploadedFile.filepath || !uploadedFile.originalFilename) {
      throw new Error('Invalid file upload')
    }

    const fileContent = fs.readFileSync(uploadedFile.filepath)

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: `posts/${Date.now()}-${uploadedFile.originalFilename || 'untitled'}`,
      Body: fileContent,
      ContentType: uploadedFile.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }

    const uploadResult = await s3.upload(params).promise()

    // Clean up the temp file
    try {
      fs.unlinkSync(uploadedFile.filepath)
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