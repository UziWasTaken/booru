import { NextApiRequest, NextApiResponse } from 'next'
import busboy from 'busboy'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: '100mb'
  },
}

const BUNNY_STORAGE_API = 'https://ny.storage.bunnycdn.com'

// Parse form data using busboy
const parseForm = (req: NextApiRequest) => {
  return new Promise<{ fields: any; file: any }>((resolve, reject) => {
    const fields: any = {}
    let fileData: any = null

    const bb = busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      }
    })

    bb.on('field', (name, val) => {
      fields[name] = val
    })

    bb.on('file', async (name, file, info) => {
      const chunks: Buffer[] = []
      
      file.on('data', (chunk) => {
        chunks.push(chunk)
      })

      file.on('end', () => {
        fileData = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType
        }
      })
    })

    bb.on('finish', () => {
      resolve({ fields, file: fileData })
    })

    bb.on('error', (err) => {
      reject(err)
    })

    req.pipe(bb)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the form data
    const { fields, file } = await parseForm(req)

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('File received:', {
      name: file.filename,
      type: file.mimeType,
      size: file.buffer.length
    })

    const fileName = `${Date.now()}-${file.filename}`
    const fullPath = `images/${fileName}`

    // Upload to Bunny Storage
    const uploadResponse = await fetch(
      `${BUNNY_STORAGE_API}/${process.env.BUNNY_STORAGE_ZONE}/${fullPath}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': process.env.BUNNY_API_KEY!,
          'Content-Type': file.mimeType,
        },
        body: file.buffer,
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(`Bunny upload failed: ${uploadResponse.statusText}`)
    }

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