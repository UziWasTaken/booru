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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const form = new formidable.IncomingForm()
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        resolve({ fields, files })
      })
    })

    const file = files.file
    const fileContent = fs.readFileSync(file.filepath)

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: `posts/${Date.now()}-${file.originalFilename}`,
      Body: fileContent,
      ContentType: file.mimetype,
      ACL: 'public-read'
    }

    const uploadResult = await s3.upload(params).promise()

    res.status(200).json({ 
      url: uploadResult.Location,
      success: true 
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message,
      success: false 
    })
  }
} 