import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import formidable, { Fields, Files, File } from 'formidable'
import fs from 'fs'
import path from 'path'

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
  region: process.env.AWS_REGION || 'us-east-1'
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check content type
  const contentType = req.headers['content-type']
  if (!contentType?.includes('multipart/form-data')) {
    return res.status(415).json({ error: 'Content type must be multipart/form-data' })
  }

  try {
    // Create temp directory
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    // Configure formidable
    const form = formidable({
      uploadDir: tmpDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      filter: ({ mimetype }) => {
        // Accept only images
        return mimetype ? mimetype.includes('image/') : false
      }
    })

    // Parse the form
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    // Get the file
    const uploadedFile = files.file as unknown as File
    if (!uploadedFile) {
      throw new Error('No file uploaded')
    }

    // Read file content
    const fileContent = await fs.promises.readFile(uploadedFile.filepath)

    // Upload to S3
    const uploadResult = await s3.upload({
      Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
      Key: `uploads/${Date.now()}-${uploadedFile.originalFilename}`,
      Body: fileContent,
      ContentType: uploadedFile.mimetype || 'application/octet-stream',
      ACL: 'public-read'
    }).promise()

    // Clean up temp file
    await fs.promises.unlink(uploadedFile.filepath)

    // Return success
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