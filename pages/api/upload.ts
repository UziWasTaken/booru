import { NextApiRequest, NextApiResponse } from 'next'
import AWS from 'aws-sdk'
import busboy from 'busboy'
import fs from 'fs'
import path from 'path'

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

    const bb = busboy({ headers: req.headers })
    let fileData: Buffer | null = null
    let fileName = ''
    let mimeType = ''

    return new Promise((resolve, reject) => {
      bb.on('file', (name, file, info) => {
        const chunks: Buffer[] = []
        fileName = info.filename
        mimeType = info.mimeType

        file.on('data', (data) => {
          chunks.push(data)
        })

        file.on('end', () => {
          fileData = Buffer.concat(chunks)
        })
      })

      bb.on('finish', async () => {
        try {
          if (!fileData) {
            res.status(400).json({ success: false, error: 'No file uploaded' })
            return resolve(null)
          }

          const key = `posts/${Date.now()}-${fileName}`
          const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'danbooru-uploads-prod',
            Key: key,
            Body: fileData,
            ContentType: mimeType,
            ACL: 'public-read'
          }

          console.log('Starting S3 upload with params:', {
            ...params,
            Body: `<${fileData.length} bytes>`
          })

          const uploadResult = await s3.upload(params).promise()
          console.log('S3 upload successful:', uploadResult)

          res.status(200).json({ 
            url: uploadResult.Location,
            success: true 
          })
          resolve(null)
        } catch (error: any) {
          console.error('Upload error:', error)
          res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message || 'Unknown error',
            success: false 
          })
          resolve(null)
        }
      })

      bb.on('error', (error: Error) => {
        console.error('Busboy error:', error)
        res.status(500).json({ 
          message: 'Upload failed', 
          error: error.message || 'Unknown error',
          success: false 
        })
        resolve(null)
      })

      req.pipe(bb)
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