/**
 * GoRedirect: CTA 클릭 추적 → 구글폼 리다이렉트
 * URL: /go?type=demo&channel=linkedin&campaign=thailand-deal
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FORM_URLS = {
  demo: 'https://docs.google.com/forms/d/1NgFb9ooo3WdKejRN1ehNQum0icoOScspsXd5Oo0JtIw/viewform',
  consult: 'https://docs.google.com/forms/d/1eGOiLCtT4Q72L0NdFypuIeUjA4792BtBEmVLChZy7cU/viewform',
};

export default function GoRedirect() {
  useEffect(() => {
    async function trackAndRedirect() {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type') || 'consult';
      const channel = params.get('channel') || 'direct';
      const campaign = params.get('campaign') || null;
      const prId = params.get('pr_id') || null;

      // Supabase에 클릭 기록 (실패해도 리다이렉트 진행)
      try {
        if (supabase) {
          await supabase.from('cta_clicks').insert({
            cta_type: type,
            channel,
            campaign,
            press_release_id: prId,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent || null,
          });
        }
      } catch (err) {
        console.error('[CTA] 클릭 기록 실패:', err);
      }

      // 구글폼으로 리다이렉트
      window.location.href = FORM_URLS[type] || FORM_URLS.consult;
    }

    trackAndRedirect();
  }, []);

  return (
    <div className="flex items-center justify-center h-screen text-steel text-sm">
      잠시만 기다려주세요...
    </div>
  );
}
