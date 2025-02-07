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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8'
    })

    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err)
          reject(err)
          return
        }
        resolve([fields, files])
      })
    })

    if (!files.file) {
      throw new Error('No file uploaded')
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const fileContent = fs.readFileSync(file.filepath)

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: `posts/${Date.now()}-${file.originalFilename || 'untitled'}`,
      Body: fileContent,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }

    const uploadResult = await s3.upload(params).promise()

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
      error: error.message,
      success: false 
    })
  }
} 