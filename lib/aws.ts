import { S3Client } from '@aws-sdk/client-s3'

// Configure AWS on the server side
let s3Client: S3Client | null = null

if (typeof window === 'undefined') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
    }
  })
}

export async function uploadToS3(file: File, path: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 client not initialized')
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const command = new PutObjectCommand({
    Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
    Key: `${path}/${Date.now()}-${file.name}`,
    Body: fileBuffer,
    ContentType: file.type,
    ACL: 'public-read'
  })

  await s3Client.send(command)
  
  return `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}/${file.name}`
}

export default s3Client 