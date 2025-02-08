import { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import fs from 'fs/promises'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

const BUNNY_STORAGE_API = 'https://ny.storage.bunnycdn.com'

// Parse form data
const parseForm = async (req: NextApiRequest) => {
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const uploadDir = path.join(process.cwd(), 'tmp')
    
    // Ensure upload directory exists
    fs.mkdir(uploadDir, { recursive: true }).catch(console.error)

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    })

    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { files } = await parseForm(req)
    const uploadedFile = files.file as File | File[] | undefined
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Read the file
    const fileContent = await fs.readFile(file.filepath)
    const fileName = `${Date.now()}-${file.originalFilename}`
    const fullPath = `images/${fileName}`

    // Upload to Bunny Storage
    const uploadResponse = await fetch(
      `${BUNNY_STORAGE_API}/${process.env.BUNNY_STORAGE_ZONE}/${fullPath}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': process.env.BUNNY_API_KEY!,
          'Content-Type': file.mimetype || 'application/octet-stream',
        },
        body: fileContent,
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(`Bunny upload failed: ${uploadResponse.statusText}`)
    }

    // Clean up the temp file
    await fs.unlink(file.filepath).catch(console.error)

    // Return CDN URL
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