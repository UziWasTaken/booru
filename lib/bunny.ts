const BUNNY_STORAGE_API = 'https://storage.bunnycdn.com'

export async function uploadToBunny(file: File, path: string): Promise<string> {
  const fileName = `${Date.now()}-${file.name}`
  const fullPath = `${path}/${fileName}`
  
  // Get file buffer
  const buffer = await file.arrayBuffer()

  try {
    // Upload to Bunny Storage
    const response = await fetch(`${BUNNY_STORAGE_API}/${process.env.BUNNY_STORAGE_ZONE}/${fullPath}`, {
      method: 'PUT',
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY!,
        'Content-Type': file.type,
      },
      body: buffer,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    // Return CDN URL
    return `${process.env.BUNNY_CDN_URL}/${fullPath}`
  } catch (error) {
    console.error('Bunny upload error:', error)
    throw error
  }
} 