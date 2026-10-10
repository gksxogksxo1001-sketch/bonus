import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'Supabase environment variables are missing.' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  try {
    const { data, error } = await supabase.from('notes').select('title, content');
    if (error) {
      return response.status(500).json({ error: 'Failed to fetch notes.' });
    }
    return response.status(200).json({ sampleMarker: 'SAMPLE_NOTE_1', notes: data });
  } catch (err) {
    return response.status(500).json({ error: 'Internal server error.' });
  }
}
