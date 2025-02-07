import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase.from('your_table').select('count').limit(1)
    
    return res.status(200).json({
      status: 'ok',
      supabase: error ? 'error' : 'connected',
      data: data
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect' })
  }
} 