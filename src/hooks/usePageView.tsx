import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getVisitorId = (): string => {
  const key = 'visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

export const usePageView = (pagePath: string) => {
  useEffect(() => {
    const trackView = async () => {
      const sessionKey = `pv_${pagePath}_${new Date().toDateString()}`;
      if (sessionStorage.getItem(sessionKey)) return;

      const visitorId = getVisitorId();
      await supabase.from('page_views' as any).insert({
        page_path: pagePath,
        visitor_id: visitorId,
      });
      sessionStorage.setItem(sessionKey, '1');
    };

    trackView();
  }, [pagePath]);
};
