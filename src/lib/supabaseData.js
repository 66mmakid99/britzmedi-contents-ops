/**
 * Supabase CRUD — press_releases + pipeline_items
 * Supabase 미설정 시 null 반환 (localStorage 폴백 대비)
 */

import { supabase } from './supabase';

/** UUID v4 형식인지 확인 */
function isUUID(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// =====================================================
// press_releases
// =====================================================

export async function savePressRelease(data) {
  if (!supabase) return null;
  try {
    const row = {
      title: data.title,
      source: data.source || null,
      press_release: data.press_release || null,
      category: data.category || null,
      image_url: data.image_url || null,
      status: data.status || 'draft',
    };
    // id가 UUID면 upsert, 아니면 새로 생성 (id 생략)
    if (data.id && isUUID(data.id)) {
      row.id = data.id;
    }
    const { data: saved, error } = await supabase
      .from('press_releases')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return saved;
  } catch (e) {
    console.error('[Supabase] savePressRelease 실패:', e.message);
    return null;
  }
}

export async function updatePressRelease(id, data) {
  if (!supabase || !isUUID(id)) return null;
  try {
    const { data: row, error } = await supabase
      .from('press_releases')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] updatePressRelease 실패:', e.message);
    return null;
  }
}

export async function deletePressRelease(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('press_releases')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deletePressRelease 실패:', e.message);
    return false;
  }
}

export async function getAllPressReleases() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('press_releases')
      .select('id, title, source, press_release, category, image_url, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] getAllPressReleases 실패:', e.message);
    return null;
  }
}

export async function getPressReleaseById(id) {
  if (!supabase || !isUUID(id)) return null;
  try {
    const { data, error } = await supabase
      .from('press_releases')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] getPressReleaseById 실패:', e.message);
    return null;
  }
}

export async function updateChannelContent(id, channelId, content) {
  if (!supabase || !isUUID(id)) return null;
  // channels 컬럼이 테이블에 없을 수 있으므로 에러 시 조용히 실패
  try {
    const { data: current, error: fetchErr } = await supabase
      .from('press_releases')
      .select('id')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    // press_release 컬럼에 채널 결과를 JSON으로 저장 (channels 컬럼 대안)
    // channels 컬럼이 존재하면 사용, 없으면 무시
    const { error } = await supabase.rpc('update_channel_content', {
      pr_id: id,
      ch_id: channelId,
      ch_content: JSON.stringify(content),
    });

    // RPC가 없으면 직접 업데이트 시도
    if (error) {
      // 폴백: press_release 필드는 건드리지 않고 조용히 실패
      console.warn('[Supabase] updateChannelContent: channels 컬럼 또는 RPC 미존재, 스킵');
      return null;
    }
    return current;
  } catch (e) {
    console.error('[Supabase] updateChannelContent 실패:', e.message);
    return null;
  }
}

// =====================================================
// pipeline_items
// =====================================================

export async function savePipelineItem(data) {
  if (!supabase || !isUUID(data.press_release_id)) return null;
  try {
    const { data: row, error } = await supabase
      .from('pipeline_items')
      .insert({
        press_release_id: data.press_release_id,
        stage: data.stage || 'draft',
        position: data.position || 0,
        notes: data.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] savePipelineItem 실패:', e.message);
    return null;
  }
}

export async function updatePipelineStage(id, newStage) {
  if (!supabase || !isUUID(id)) return null;
  try {
    const { data: row, error } = await supabase
      .from('pipeline_items')
      .update({ stage: newStage })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] updatePipelineStage 실패:', e.message);
    return null;
  }
}

export async function getAllPipelineItems() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('*, press_releases(id, title, status, category, created_at)')
      .order('position', { ascending: true });
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] getAllPipelineItems 실패:', e.message);
    return null;
  }
}

export async function deletePipelineItem(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('pipeline_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deletePipelineItem 실패:', e.message);
    return false;
  }
}

// =====================================================
// 마이그레이션: localStorage → Supabase (최초 1회)
// =====================================================

export async function migrateLocalToSupabase() {
  if (!supabase) return;
  if (localStorage.getItem('bm-migrated')) return;

  try {
    const raw = localStorage.getItem('bm-contents');
    if (!raw) { localStorage.setItem('bm-migrated', 'true'); return; }

    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.setItem('bm-migrated', 'true');
      return;
    }

    let migrated = 0;
    for (const item of items) {
      // draft 필드에서 보도자료 텍스트 추출
      const prText = typeof item.draft === 'string' ? item.draft : null;

      const pr = await savePressRelease({
        title: item.title || '제목 없음',
        source: null,
        press_release: prText,
        category: item.pillar || null,
        image_url: null,
        status: mapStage(item.stage),
      });

      if (pr) {
        await savePipelineItem({
          press_release_id: pr.id,
          stage: mapStage(item.stage),
          position: 0,
        });
        migrated++;
      }
    }

    localStorage.setItem('bm-migrated', 'true');
    console.log(`✅ Migrated ${migrated} items to Supabase`);
  } catch (e) {
    console.error('[Migration] 실패:', e.message);
  }
}

/** localStorage stage → Supabase stage 매핑 */
function mapStage(stage) {
  const map = {
    idea: 'draft',
    draft: 'draft',
    review: 'review',
    ready: 'approved',
    approved: 'approved',
    published: 'published',
  };
  return map[stage] || 'draft';
}
