import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from '../src/verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));

let verifier = null;
function getVerifier(secretKey) {
  if (!verifier) {
    verifier = createLoginVerifier({
      config,
      supabaseSecretKey: secretKey,
    });
  }
  return verifier;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'Supabase environment variables are missing.' });
  }

  // 브라우저가 전달한 userId, role 등은 일체 신뢰하지 않고 오직 Authorization 헤더 토큰만 검증
  const authorization = request.headers['authorization'] || request.headers['Authorization'];
  if (!authorization) {
    return response.status(401).json({ error: 'Unauthorized: missing authorization token' });
  }

  let verified;
  try {
    const verifyLogin = getVerifier(supabaseSecretKey);
    verified = await verifyLogin(authorization);
  } catch (err) {
    return response.status(500).json({ error: 'Internal verifier error' });
  }

  if (!verified) {
    return response.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  try {
    const { data, error } = await supabase.from('notes').select('title, content');
    if (error) {
      return response.status(500).json({ error: 'Failed to fetch notes.' });
    }
    return response.status(200).json({ sampleMarker: config.sampleMarker || 'SAMPLE_NOTE_1', notes: data });
  } catch (err) {
    return response.status(500).json({ error: 'Internal server error.' });
  }
}

