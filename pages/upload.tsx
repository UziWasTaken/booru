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
      formData.append('tags', tags)

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      // Set proper headers for multipart form data
      const response = await fetch('/api/upload', {
        method: 'POST',
        // Let browser set the Content-Type header automatically
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('posts')
        .insert([
          {
            image_url: data.url,
            thumbnail_url: data.url,
            tags: tags
          }
        ])

      if (dbError) throw dbError

      router.push('/')
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
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
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  console.log('Selected file:', {
                    name: file.name,
                    type: file.type,
                    size: file.size
                  })
                  setFile(file)
                }
              }}
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