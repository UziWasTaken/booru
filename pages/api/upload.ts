import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable from 'formidable'
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
    const form = formidable()
    const [fields, files] = await form.parse(req)
    
    const uploadedFiles = files.file
    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error('No file uploaded')
    }

    const uploadedFile = uploadedFiles[0] as unknown as FormidableFile
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
    fs.unlinkSync(uploadedFile.filepath)

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