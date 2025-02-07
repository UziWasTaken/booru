import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
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
      
      const formData = new FormData()
      formData.append('file', file)

      // Upload to S3 through API route
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        // Remove any Content-Type header to let the browser set it with the boundary
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.message || 'Upload failed')
      }

      const { url, success, message } = await uploadRes.json()

      if (!success) throw new Error(message)

      // Save to Supabase
      const { data, error: dbError } = await supabase
        .from('posts')
        .insert([
          {
            title: file.name,
            image_url: url,
            thumbnail_url: url,
            tags: tags,
          }
        ])

      if (dbError) throw dbError
      
      router.push('/')
    } catch (err: any) {
      setError('Upload failed: ' + (err.message || 'Unknown error'))
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