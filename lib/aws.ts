import AWS from 'aws-sdk'

// Configure AWS on the server side
if (typeof window === 'undefined') {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  })
}

export const s3 = new AWS.S3()

export async function uploadToS3(file: File, path: string): Promise<string> {
  // Create a new S3 instance with credentials for client-side
  const s3Client = new AWS.S3({
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
  })

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const params = {
    Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || 'danbooru-uploads-prod',
    Key: `${path}/${Date.now()}-${file.name}`,
    Body: fileBuffer,
    ContentType: file.type,
    ACL: 'public-read'
  }

  const result = await s3Client.upload(params).promise()
  return result.Location
} 