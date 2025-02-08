import { NextApiRequest, NextApiResponse } from 'next'
import multiparty from 'multiparty'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: '100mb'
  },
}

const BUNNY_STORAGE_API = 'https://ny.storage.bunnycdn.com'

// Parse form data
const parseForm = (req: NextApiRequest) => {
  return new Promise<{ fields: any; files: any }>((resolve, reject) => {
    // Add proper configuration for multiparty
    const form = new multiparty.Form({
      maxFieldsSize: 100 * 1024 * 1024, // 100MB
      maxFields: 1000,
      maxFilesSize: 100 * 1024 * 1024, // 100MB
      autoFiles: true,
      uploadDir: '/tmp'
    })

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err)
        reject(err)
      }
      resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the multipart form data
    const { fields, files } = await parseForm(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('File received:', {
      name: file.originalFilename,
      type: file.headers['content-type'],
      size: file.size
    })

    // Read file content
    const fileContent = await fs.promises.readFile(file.path)
    const fileName = `${Date.now()}-${file.originalFilename}`
    const fullPath = `images/${fileName}`

    // Upload to Bunny Storage
    const uploadResponse = await fetch(
      `${BUNNY_STORAGE_API}/${process.env.BUNNY_STORAGE_ZONE}/${fullPath}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': process.env.BUNNY_API_KEY!,
          'Content-Type': file.headers['content-type'] || 'application/octet-stream',
        },
        body: fileContent,
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(`Bunny upload failed: ${uploadResponse.statusText}`)
    }

    // Clean up temp file
    await fs.promises.unlink(file.path)

    // Return CDN URL with your custom domain
    const cdnUrl = `${process.env.BUNNY_CDN_URL}/${fullPath}`

    return res.status(200).json({
      success: true,
      url: cdnUrl,
      key: fullPath
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    })
  }
} 