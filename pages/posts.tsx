import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { Post } from '../types/post'
import styles from '../styles/Posts.module.css'

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setPosts(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1>All Posts</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <div key={post.id} className={styles.card}>
                <img src={post.thumbnail_url} alt={post.tags} />
                <div className={styles.tags}>
                  {post.tags.split(' ').map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 