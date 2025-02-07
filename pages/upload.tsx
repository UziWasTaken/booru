import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { uploadToS3 } from '../lib/aws'
import Navbar from '../components/Navbar'
import styles from '../styles/Upload.module.css'

export default function Upload() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    try {
      setLoading(true)
      
      // Upload to S3
      const imageUrl = await uploadToS3(file, 'posts')
      
      // Create thumbnail (you might want to implement thumbnail generation)
      const thumbnailUrl = imageUrl // For now, using same URL

      // Save to Supabase
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: file.name,
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            tags: tags,
          }
        ])

      if (error) throw error
      
      router.push('/')
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1>Upload Image</h1>
        <form onSubmit={handleUpload}>
          <div className={styles.formGroup}>
            <label>Image</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tags (space separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1 tag2 tag3"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
} 