import { randomUUID } from 'node:crypto';
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

  // 브라우저가 전달한 임의의 userId, role 등은 신뢰하지 않고 오직 Authorization 헤더 토큰만 검증
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

  if (!verified || !verified.userId) {
    return response.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // 요청 ID 추출 (Vercel rewrite query 파라미터 또는 URL pathname)
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const pathId = request.query?.id || (pathSegments.length >= 3 ? pathSegments[2] : null);

  const method = request.method?.toUpperCase();

  // 1. GET 요청
  if (method === 'GET') {
    if (pathId) {
      // 한 건 GET: 본인 메모인지 확인 후 { id, title, body } 반환 (상대 메모는 403, 없으면 404)
      const { data, error } = await supabase
        .from('notes')
        .select('id, owner_id, title, content')
        .eq('id', pathId)
        .maybeSingle();

      if (error) return response.status(500).json({ error: error.message });
      if (!data) return response.status(404).json({ error: 'Note not found' });
      if (data.owner_id !== verified.userId) {
        return response.status(403).json({ error: 'Forbidden: access denied' });
      }

      return response.status(200).json({ id: data.id, title: data.title, body: data.content });
    }

    // 목록 GET: 본인 소유 메모만 조회
    const { data, error } = await supabase
      .from('notes')
      .select('id, owner_id, title, content')
      .eq('owner_id', verified.userId)
      .order('created_at', { ascending: true });

    if (error) return response.status(500).json({ error: 'Failed to fetch notes.' });

    const notes = (data || []).map(r => ({ id: r.id, title: r.title, body: r.content }));
    return response.status(200).json(notes);
  }

  // 2. POST 요청: 가상 메모 추가 (URL·본문의 owner_id를 무시하고 검증된 사용자 ID로 저장)
  if (method === 'POST') {
    let payload = request.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    payload = payload || {};

    const id = payload.id || randomUUID();
    const title = payload.title || '';
    const content = payload.body ?? payload.content ?? '';

    // 검증된 ID로 저장
    const { error } = await supabase.from('notes').insert({
      id,
      owner_id: verified.userId,
      title,
      content,
    });

    if (error) return response.status(500).json({ error: error.message });
    return response.status(201).json({ id });
  }

  // 3. PUT 요청: 메모 수정 (기존 행과 새 행 소유자가 모두 본인인지 확인, 소유자 변경 거부)
  if (method === 'PUT') {
    if (!pathId) return response.status(400).json({ error: 'Missing note id' });

    let payload = request.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }
    payload = payload || {};

    // 1) 기존 행 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from('notes')
      .select('id, owner_id')
      .eq('id', pathId)
      .maybeSingle();

    if (fetchError) return response.status(500).json({ error: fetchError.message });
    if (!existing) return response.status(404).json({ error: 'Note not found' });
    if (existing.owner_id !== verified.userId) {
      return response.status(403).json({ error: 'Forbidden: cannot edit other user note' });
    }

    // 2) 새 행 소유자 확인 (소유자 변경 시도 차단)
    if (payload.owner_id && payload.owner_id !== verified.userId) {
      return response.status(403).json({ error: 'Forbidden: cannot change owner' });
    }

    const updates = { owner_id: verified.userId };
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.body !== undefined || payload.content !== undefined) {
      updates.content = payload.body ?? payload.content;
    }

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', pathId)
      .eq('owner_id', verified.userId)
      .select('id, title, content')
      .maybeSingle();

    if (error) return response.status(500).json({ error: error.message });
    if (!data) return response.status(404).json({ error: 'Note not found' });

    return response.status(200).json({ id: data.id, title: data.title, body: data.content });
  }

  // 4. DELETE 요청: 메모 삭제 (본인 메모만 삭제 허용)
  if (method === 'DELETE') {
    if (!pathId) return response.status(400).json({ error: 'Missing note id' });

    // 기존 행 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from('notes')
      .select('id, owner_id')
      .eq('id', pathId)
      .maybeSingle();

    if (fetchError) return response.status(500).json({ error: fetchError.message });
    if (!existing) return response.status(404).json({ error: 'Note not found' });
    if (existing.owner_id !== verified.userId) {
      return response.status(403).json({ error: 'Forbidden: cannot delete other user note' });
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', pathId)
      .eq('owner_id', verified.userId);

    if (error) return response.status(500).json({ error: error.message });
    return response.status(200).json({ success: true, id: pathId });
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
