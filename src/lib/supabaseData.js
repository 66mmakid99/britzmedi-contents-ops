/**
 * Supabase CRUD — Content Intelligence System
 * DB 재구성: channels jsonb 제거 → channel_contents 테이블 분리
 * Supabase 미설정 시 null 반환 (localStorage 폴백 대비)
 */

import { supabase } from './supabase';

/** UUID v4 형식인지 확인 */
export function isUUID(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/** 코드 채널ID → DB 채널명 매핑 (가능한 모든 변형 포함) */
const channelToDb = {
  'naver-blog': 'naver_blog',
  'naver_blog': 'naver_blog',
  'naverblog': 'naver_blog',
  'naver': 'naver_blog',
  'blog': 'naver_blog',
  'email-newsletter': 'email',
  'email_newsletter': 'email',
  'newsletter': 'email',
  'email': 'email',
  'kakao': 'kakao',
  'kakaotalk': 'kakao',
  'instagram': 'instagram',
  'insta': 'instagram',
  'linkedin': 'linkedin',
};

/** DB 채널명 → 코드 채널ID 역매핑 */
const dbToChannel = {
  'naver_blog': 'naver-blog',
  'email': 'email-newsletter',
  'kakao': 'kakao',
  'instagram': 'instagram',
  'linkedin': 'linkedin',
};

// =====================================================
// press_releases
// =====================================================

export async function savePressRelease(data) {
  if (!supabase) return null;
  try {
    const row = {
      title: data.title || null,
      subtitle: data.subtitle || null,
      source_text: data.source || data.raw_input || data.source_text || null,
      ai_draft: data.press_release || data.ai_draft || null,
      final_text: data.press_release || data.final_text || data.ai_draft || null,
      category: data.category || null,
      product: data.product || null,
      timing: data.timing || null,
      image_url: data.image_url || null,
      status: data.status || 'draft',
      spokesperson: data.spokesperson || null,
      quote_text: data.quote_text || null,
    };
    if (data.id && isUUID(data.id)) row.id = data.id;

    const { data: saved, error } = await supabase
      .from('press_releases')
      .insert(row)
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
    // press_release → ai_draft/final_text 매핑
    const update = { ...data };
    if (update.press_release) {
      update.ai_draft = update.ai_draft || update.press_release;
      update.final_text = update.final_text || update.press_release;
      delete update.press_release;
    }
    if (update.source) {
      update.source_text = update.source_text || update.source;
      delete update.source;
    }
    delete update.channels;
    delete update.raw_input;

    const { data: row, error } = await supabase
      .from('press_releases')
      .update(update)
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
    const { data: prs, error } = await supabase
      .from('press_releases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // channel_contents를 조인하여 기존 호환 channels 프로퍼티 구성
    for (const pr of prs) {
      pr.press_release = pr.final_text || pr.ai_draft;
      pr.source = pr.source_text;

      const { data: chRows } = await supabase
        .from('channel_contents')
        .select('*')
        .eq('press_release_id', pr.id);

      pr.channels = {};
      chRows?.forEach(ch => {
        const codeId = dbToChannel[ch.channel] || ch.channel;
        pr.channels[codeId] = ch.final_text || ch.ai_draft;
      });
    }

    return prs;
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
    data.press_release = data.final_text || data.ai_draft;
    data.source = data.source_text;
    return data;
  } catch (e) {
    console.error('[Supabase] getPressReleaseById 실패:', e.message);
    return null;
  }
}

// =====================================================
// channel_contents (★ 신규 — channels jsonb 대체)
// =====================================================

export async function saveChannelContent(pressReleaseId, channel, content) {
  if (!supabase || !isUUID(pressReleaseId)) return null;
  try {
    console.log('[saveChannelContent] raw channel:', channel);
    const mapped = channelToDb[channel];
    if (!mapped) {
      console.warn(`[saveChannelContent] 알 수 없는 채널명: "${channel}" — 매핑 없이 원래 값으로 시도`);
    }
    channel = mapped || channel;
    const text = typeof content === 'string' ? content : (content?.body || content?.caption || JSON.stringify(content));
    const charCount = text?.length || 0;

    const { data: row, error } = await supabase
      .from('channel_contents')
      .upsert({
        press_release_id: pressReleaseId,
        channel,
        ai_draft: text,
        ai_draft_char_count: charCount,
        final_text: text,
        final_char_count: charCount,
        title: content?.title || null,
        hashtags: content?.hashtags || null,
        seo_keywords: content?.seoKeywords || content?.coreKeywords || null,
        image_guide: content?.imageGuide || null,
        status: 'draft',
      }, { onConflict: 'press_release_id,channel' })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] saveChannelContent 실패:', e.message);
    return null;
  }
}

export async function updateChannelFinalText(id, finalText) {
  if (!supabase || !isUUID(id)) return null;
  try {
    // ai_draft를 가져와서 edit_distance 계산
    const { data: current, error: fetchErr } = await supabase
      .from('channel_contents')
      .select('ai_draft, ai_draft_char_count')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const aiLen = current.ai_draft_char_count || current.ai_draft?.length || 0;
    const finalLen = finalText?.length || 0;
    const editDistance = Math.abs(finalLen - aiLen);
    const editRatio = aiLen > 0 ? +(editDistance / aiLen).toFixed(4) : 0;

    const { data: row, error } = await supabase
      .from('channel_contents')
      .update({
        final_text: finalText,
        final_char_count: finalLen,
        edit_distance: editDistance,
        edit_ratio: editRatio,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] updateChannelFinalText 실패:', e.message);
    return null;
  }
}

export async function getChannelContents(pressReleaseId) {
  if (!supabase || !isUUID(pressReleaseId)) return [];
  try {
    const { data, error } = await supabase
      .from('channel_contents')
      .select('*')
      .eq('press_release_id', pressReleaseId);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getChannelContents 실패:', e.message);
    return [];
  }
}

export async function getChannelContent(pressReleaseId, channel) {
  if (!supabase || !isUUID(pressReleaseId)) return null;
  try {
    const dbChannel = channelToDb[channel] || channel;
    const { data, error } = await supabase
      .from('channel_contents')
      .select('*')
      .eq('press_release_id', pressReleaseId)
      .eq('channel', dbChannel)
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Supabase] getChannelContent 실패:', e.message);
    return null;
  }
}

export async function deleteChannelContent(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('channel_contents')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deleteChannelContent 실패:', e.message);
    return false;
  }
}

// =====================================================
// edit_history
// =====================================================

export async function saveEditHistory(data) {
  if (!supabase) return null;
  try {
    const { data: row, error } = await supabase
      .from('edit_history')
      .insert({
        content_type: data.content_type,
        content_id: data.content_id,
        channel: data.channel || null,
        before_text: data.before_text || null,
        after_text: data.after_text || null,
        edit_type: data.edit_type || 'other',
        edit_pattern: data.edit_pattern || null,
        edit_reason: data.edit_reason || null,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] saveEditHistory 실패:', e.message);
    return null;
  }
}

export async function getEditHistory(contentId) {
  if (!supabase || !isUUID(contentId)) return [];
  try {
    const { data, error } = await supabase
      .from('edit_history')
      .select('*')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getEditHistory 실패:', e.message);
    return [];
  }
}

export async function getEditPatterns(channel) {
  if (!supabase) return [];
  try {
    const dbChannel = channelToDb[channel] || channel;
    const { data, error } = await supabase
      .from('edit_history')
      .select('edit_type, edit_pattern, edit_reason')
      .eq('channel', dbChannel)
      .not('edit_pattern', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getEditPatterns 실패:', e.message);
    return [];
  }
}

// =====================================================
// brand_voice_rules
// =====================================================

export async function getAllBrandVoiceRules() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('brand_voice_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getAllBrandVoiceRules 실패:', e.message);
    return [];
  }
}

export async function getBrandVoiceRules(channel) {
  if (!supabase) return [];
  try {
    const dbChannel = channelToDb[channel] || channel;
    const { data, error } = await supabase
      .from('brand_voice_rules')
      .select('*')
      .eq('is_active', true)
      .or(`channel.eq.${dbChannel},channel.is.null`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getBrandVoiceRules 실패:', e.message);
    return [];
  }
}

export async function saveBrandVoiceRule(data) {
  if (!supabase) return null;
  try {
    const { data: row, error } = await supabase
      .from('brand_voice_rules')
      .insert({
        rule_type: data.rule_type,
        channel: data.channel || null,
        rule_text: data.rule_text,
        bad_example: data.bad_example || null,
        good_example: data.good_example || null,
        source: data.source || 'manual',
        confidence: data.confidence || 1.0,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] saveBrandVoiceRule 실패:', e.message);
    return null;
  }
}

export async function updateBrandVoiceRule(id, data) {
  if (!supabase || !isUUID(id)) return null;
  try {
    const { data: row, error } = await supabase
      .from('brand_voice_rules')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] updateBrandVoiceRule 실패:', e.message);
    return null;
  }
}

export async function deleteBrandVoiceRule(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('brand_voice_rules')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deleteBrandVoiceRule 실패:', e.message);
    return false;
  }
}

// =====================================================
// fact_database
// =====================================================

export async function getAllFacts() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('fact_database')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getAllFacts 실패:', e.message);
    return [];
  }
}

export async function getFactsByCategory(category) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('fact_database')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getFactsByCategory 실패:', e.message);
    return [];
  }
}

export async function getFactsBySubject(subject) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('fact_database')
      .select('*')
      .eq('subject', subject)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getFactsBySubject 실패:', e.message);
    return [];
  }
}

export async function saveFact(data) {
  if (!supabase) return null;
  try {
    const { data: row, error } = await supabase
      .from('fact_database')
      .insert({
        category: data.category,
        subject: data.subject,
        fact_text: data.fact_text,
        fact_pairs: data.fact_pairs || null,
        valid_from: data.valid_from || null,
        valid_until: data.valid_until || null,
        source_press_release_id: data.source_press_release_id || null,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] saveFact 실패:', e.message);
    return null;
  }
}

export async function updateFact(id, data) {
  if (!supabase || !isUUID(id)) return null;
  try {
    const { data: row, error } = await supabase
      .from('fact_database')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] updateFact 실패:', e.message);
    return null;
  }
}

export async function deleteFact(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('fact_database')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deleteFact 실패:', e.message);
    return false;
  }
}

// =====================================================
// content_blocks
// =====================================================

export async function getAllContentBlocks() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('is_active', true)
      .order('use_count', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getAllContentBlocks 실패:', e.message);
    return [];
  }
}

export async function getContentBlocksByCategory(category) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('use_count', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Supabase] getContentBlocksByCategory 실패:', e.message);
    return [];
  }
}

export async function saveContentBlock(data) {
  if (!supabase) return null;
  try {
    const { data: row, error } = await supabase
      .from('content_blocks')
      .insert({
        label: data.label,
        body: data.body,
        category: data.category || null,
        tags: data.tags || null,
        source_press_release_id: data.source_press_release_id || null,
        use_count: 0,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] saveContentBlock 실패:', e.message);
    return null;
  }
}

export async function incrementBlockUsage(id) {
  if (!supabase || !isUUID(id)) return null;
  try {
    // use_count + 1, last_used_at 갱신
    const { data: current, error: fetchErr } = await supabase
      .from('content_blocks')
      .select('use_count')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { data: row, error } = await supabase
      .from('content_blocks')
      .update({
        use_count: (current.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.error('[Supabase] incrementBlockUsage 실패:', e.message);
    return null;
  }
}

export async function deleteContentBlock(id) {
  if (!supabase || !isUUID(id)) return false;
  try {
    const { error } = await supabase
      .from('content_blocks')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] deleteContentBlock 실패:', e.message);
    return false;
  }
}

// =====================================================
// pipeline_items (기존 유지)
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
  if (localStorage.getItem('bm-migrated-v2')) return;

  try {
    const raw = localStorage.getItem('bm-contents');
    if (!raw) { localStorage.setItem('bm-migrated-v2', 'true'); return; }

    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.setItem('bm-migrated-v2', 'true');
      return;
    }

    let migrated = 0;
    for (const item of items) {
      const prText = typeof item.draft === 'string' ? item.draft : null;

      const pr = await savePressRelease({
        title: item.title || '제목 없음',
        press_release: prText,
        category: item.pillar || null,
        status: mapStage(item.stage),
      });

      if (pr) {
        await savePipelineItem({
          press_release_id: pr.id,
          stage: mapStage(item.stage),
          position: 0,
        });

        // channels jsonb → channel_contents 분리 저장
        if (typeof item.draft === 'object' && item.draft !== null) {
          for (const [ch, text] of Object.entries(item.draft)) {
            if (text && typeof text === 'string') {
              await saveChannelContent(pr.id, ch, text);
            }
          }
        }

        migrated++;
      }
    }

    localStorage.setItem('bm-migrated-v2', 'true');
    console.log(`✅ Migrated ${migrated} items to Supabase (v2)`);
  } catch (e) {
    console.error('[Migration v2] 실패:', e.message);
  }
}

function mapStage(stage) {
  const map = {
    idea: 'draft',
    draft: 'draft',
    review: 'reviewing',
    ready: 'approved',
    approved: 'approved',
    published: 'published',
  };
  return map[stage] || 'draft';
}
