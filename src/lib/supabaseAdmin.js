/**
 * supabaseAdmin.js — 챗봇 / 홈페이지 / 리드 관리 데이터 레이어
 * Supabase 테이블: chatbot_conversations, chatbot_messages, chatbot_faq, chatbot_settings,
 *                  website_posts, contact_inquiries, leads, lead_activities
 */
import { supabase } from './supabase';

// =====================================================
// 챗봇 관리
// =====================================================

/** 대화 목록 (최신순, 페이지네이션) */
export async function getChatbotConversations({ status, limit = 50, offset = 0 } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase
      .from('chatbot_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Admin] getChatbotConversations:', e.message);
    return [];
  }
}

/** 대화 상세 + 메시지 */
export async function getChatbotConversation(id) {
  if (!supabase) return null;
  try {
    const [convRes, msgRes] = await Promise.all([
      supabase.from('chatbot_conversations').select('*').eq('id', id).single(),
      supabase.from('chatbot_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }),
    ]);
    if (convRes.error) throw convRes.error;
    return { ...convRes.data, messages: msgRes.data || [] };
  } catch (e) {
    console.error('[Admin] getChatbotConversation:', e.message);
    return null;
  }
}

/** 대화 상태 변경 */
export async function updateConversationStatus(id, status) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('chatbot_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Admin] updateConversationStatus:', e.message);
    return null;
  }
}

/** 챗봇 통계 */
export async function getChatbotStats() {
  if (!supabase) return null;
  try {
    const [total, active, resolved, escalated] = await Promise.all([
      supabase.from('chatbot_conversations').select('id', { count: 'exact', head: true }),
      supabase.from('chatbot_conversations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('chatbot_conversations').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('chatbot_conversations').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
    ]);
    // 평균 만족도
    const { data: satData } = await supabase
      .from('chatbot_conversations')
      .select('satisfaction_score')
      .not('satisfaction_score', 'is', null);
    const scores = (satData || []).map(d => d.satisfaction_score).filter(Boolean);
    const avgSat = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';

    return {
      total: total.count || 0,
      active: active.count || 0,
      resolved: resolved.count || 0,
      escalated: escalated.count || 0,
      avgSatisfaction: avgSat,
    };
  } catch (e) {
    console.error('[Admin] getChatbotStats:', e.message);
    return null;
  }
}

/** FAQ 목록 */
export async function getChatbotFaq() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('chatbot_faq')
      .select('*')
      .order('usage_count', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Admin] getChatbotFaq:', e.message);
    return [];
  }
}

/** FAQ 추가/수정/삭제 */
export async function saveFaq(faq) {
  if (!supabase) return null;
  try {
    if (faq.id) {
      const { data, error } = await supabase.from('chatbot_faq')
        .update({ question: faq.question, answer: faq.answer, category: faq.category, is_active: faq.is_active, updated_at: new Date().toISOString() })
        .eq('id', faq.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('chatbot_faq')
        .insert({ question: faq.question, answer: faq.answer, category: faq.category })
        .select().single();
      if (error) throw error;
      return data;
    }
  } catch (e) {
    console.error('[Admin] saveFaq:', e.message);
    return null;
  }
}

export async function deleteFaq(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('chatbot_faq').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Admin] deleteFaq:', e.message);
    return false;
  }
}

/** 챗봇 설정 */
export async function getChatbotSettings() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('chatbot_settings').select('*');
    if (error) throw error;
    const map = {};
    (data || []).forEach(d => { map[d.key] = d.value; });
    return map;
  } catch (e) {
    console.error('[Admin] getChatbotSettings:', e.message);
    return {};
  }
}

export async function updateChatbotSetting(key, value) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('chatbot_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Admin] updateChatbotSetting:', e.message);
    return null;
  }
}

// =====================================================
// 홈페이지 관리 (website_posts)
// =====================================================

/** 포스트 목록 */
export async function getWebsitePosts({ status, category, limit = 50 } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase.from('website_posts').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') q = q.eq('status', status);
    if (category && category !== 'all') q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Admin] getWebsitePosts:', e.message);
    return [];
  }
}

/** 포스트 상세 */
export async function getWebsitePost(id) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('website_posts').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Admin] getWebsitePost:', e.message);
    return null;
  }
}

/** 포스트 저장 (새로 만들기 / 수정) */
export async function saveWebsitePost(post) {
  if (!supabase) return null;
  try {
    const row = {
      title: post.title,
      slug: post.slug || generateSlug(post.title),
      body: post.body || '',
      excerpt: post.excerpt || '',
      category: post.category || 'news',
      status: post.status || 'draft',
      author: post.author || '브릿츠메디',
      featured_image: post.featured_image || null,
      seo_title: post.seo_title || post.title,
      seo_description: post.seo_description || '',
      seo_keywords: post.seo_keywords || [],
      source_press_release_id: post.source_press_release_id || null,
      published_at: post.status === 'published' ? (post.published_at || new Date().toISOString()) : post.published_at,
      updated_at: new Date().toISOString(),
    };

    if (post.id) {
      const { data, error } = await supabase.from('website_posts').update(row).eq('id', post.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('website_posts').insert(row).select().single();
      if (error) throw error;
      return data;
    }
  } catch (e) {
    console.error('[Admin] saveWebsitePost:', e.message);
    return null;
  }
}

/** 포스트 삭제 */
export async function deleteWebsitePost(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('website_posts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Admin] deleteWebsitePost:', e.message);
    return false;
  }
}

/** 홈페이지 통계 */
export async function getWebsiteStats() {
  if (!supabase) return null;
  try {
    const [total, published, draft] = await Promise.all([
      supabase.from('website_posts').select('id', { count: 'exact', head: true }),
      supabase.from('website_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('website_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    ]);
    return {
      total: total.count || 0,
      published: published.count || 0,
      draft: draft.count || 0,
    };
  } catch (e) {
    console.error('[Admin] getWebsiteStats:', e.message);
    return null;
  }
}

function generateSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    + '-' + Date.now().toString(36);
}

// =====================================================
// 문의 관리 (contact_inquiries)
// =====================================================

export async function getContactInquiries({ status, type, limit = 50 } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase.from('contact_inquiries').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') q = q.eq('status', status);
    if (type && type !== 'all') q = q.eq('inquiry_type', type);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Admin] getContactInquiries:', e.message);
    return [];
  }
}

export async function updateInquiryStatus(id, status, notes) {
  if (!supabase) return null;
  try {
    const update = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) update.notes = notes;
    const { data, error } = await supabase.from('contact_inquiries').update(update).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Admin] updateInquiryStatus:', e.message);
    return null;
  }
}

export async function saveContactInquiry(inquiry) {
  if (!supabase) return null;
  try {
    const row = {
      name: inquiry.name,
      email: inquiry.email || null,
      phone: inquiry.phone || null,
      company: inquiry.company || null,
      country: inquiry.country || null,
      position: inquiry.position || null,
      message: inquiry.message || null,
      inquiry_type: inquiry.inquiry_type || 'general',
      source: inquiry.source || 'contact_form',
      interested_product: inquiry.interested_product || null,
      status: inquiry.status || 'new',
    };
    if (inquiry.id) {
      const { data, error } = await supabase.from('contact_inquiries').update({ ...row, updated_at: new Date().toISOString() }).eq('id', inquiry.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('contact_inquiries').insert(row).select().single();
      if (error) throw error;
      return data;
    }
  } catch (e) {
    console.error('[Admin] saveContactInquiry:', e.message);
    return null;
  }
}

// =====================================================
// 리드 관리 (leads + lead_activities)
// =====================================================

export async function getLeads({ status, limit = 50 } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Admin] getLeads:', e.message);
    return [];
  }
}

export async function getLead(id) {
  if (!supabase) return null;
  try {
    const [leadRes, actRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ]);
    if (leadRes.error) throw leadRes.error;
    return { ...leadRes.data, activities: actRes.data || [] };
  } catch (e) {
    console.error('[Admin] getLead:', e.message);
    return null;
  }
}

export async function saveLead(lead) {
  if (!supabase) return null;
  try {
    const row = {
      name: lead.name,
      email: lead.email || null,
      phone: lead.phone || null,
      company: lead.company || null,
      website: lead.website || null,
      country: lead.country || null,
      position: lead.position || null,
      source: lead.source || 'contact_form',
      status: lead.status || 'new',
      score: lead.score || 0,
      deal_value: lead.deal_value || null,
      interested_products: lead.interested_products || [],
      notes: lead.notes || null,
      next_action: lead.next_action || null,
      next_action_date: lead.next_action_date || null,
      contact_inquiry_id: lead.contact_inquiry_id || null,
      updated_at: new Date().toISOString(),
    };
    if (lead.id) {
      const { data, error } = await supabase.from('leads').update(row).eq('id', lead.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('leads').insert(row).select().single();
      if (error) throw error;
      return data;
    }
  } catch (e) {
    console.error('[Admin] saveLead:', e.message);
    return null;
  }
}

export async function deleteLead(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Admin] deleteLead:', e.message);
    return false;
  }
}

/** 리드 상태 변경 + 활동 기록 */
export async function updateLeadStatus(id, newStatus, description) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    // 활동 기록
    await addLeadActivity(id, 'status_change', description || `상태 변경: ${newStatus}`);
    return data;
  } catch (e) {
    console.error('[Admin] updateLeadStatus:', e.message);
    return null;
  }
}

/** 리드 활동 추가 */
export async function addLeadActivity(leadId, type, description) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('lead_activities')
      .insert({ lead_id: leadId, type, description })
      .select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('[Admin] addLeadActivity:', e.message);
    return null;
  }
}

/** 리드 통계 */
export async function getLeadStats() {
  if (!supabase) return null;
  try {
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const counts = {};
    const results = await Promise.all(
      statuses.map(s => supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', s))
    );
    statuses.forEach((s, i) => { counts[s] = results[i].count || 0; });
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);

    // 문의 통계
    const [inquiryTotal, inquiryNew] = await Promise.all([
      supabase.from('contact_inquiries').select('id', { count: 'exact', head: true }),
      supabase.from('contact_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    counts.inquiries = inquiryTotal.count || 0;
    counts.newInquiries = inquiryNew.count || 0;

    return counts;
  } catch (e) {
    console.error('[Admin] getLeadStats:', e.message);
    return null;
  }
}

/** 문의 → 리드 전환 */
export async function convertInquiryToLead(inquiryId) {
  if (!supabase) return null;
  try {
    const { data: inq, error: inqErr } = await supabase.from('contact_inquiries').select('*').eq('id', inquiryId).single();
    if (inqErr) throw inqErr;

    const lead = await saveLead({
      name: inq.name,
      email: inq.email,
      phone: inq.phone,
      company: inq.company,
      country: inq.country,
      position: inq.position,
      source: inq.source,
      interested_products: inq.interested_product ? [inq.interested_product] : [],
      contact_inquiry_id: inquiryId,
      notes: inq.message,
    });

    if (lead) {
      await updateInquiryStatus(inquiryId, 'closed', '리드로 전환됨');
      await addLeadActivity(lead.id, 'note', `문의에서 전환 (${inq.inquiry_type})`);
    }
    return lead;
  } catch (e) {
    console.error('[Admin] convertInquiryToLead:', e.message);
    return null;
  }
}
