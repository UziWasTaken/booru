import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'
import Navbar from '../components/Navbar'
import { Post } from '../types/post'

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRecentPosts()
  }, [])

  async function fetchRecentPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setPosts(data)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .textSearch('tags', searchTerm)
      .limit(20)

    if (data) setPosts(data)
  }

  return (
    <div>
      <Head>
        <title>Booru Project</title>
        <meta name="description" content="Image Gallery" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        <div className={styles.search}>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Ex: blue_sky cloud 1girl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </form>
        </div>

        <div className={styles.grid}>
          {posts.map((post) => (
            <div key={post.id} className={styles.card}>
              <img src={post.thumbnail_url} alt={post.tags} />
              <div className={styles.tags}>
                {post.tags.split(' ').map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
} 