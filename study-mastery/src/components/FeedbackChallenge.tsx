import { useEffect, useRef, useState } from 'react';

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
let loading: Promise<void> | undefined;
function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { script.remove(); reject(new Error('timeout')); }, 12000);
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => { clearTimeout(timeout); window.turnstile ? resolve() : reject(new Error('indisponível')); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('indisponível')); };
    document.head.appendChild(script);
  }).catch(e => { loading = undefined; throw e; });
  return loading;
}
export function FeedbackChallenge({ siteKey, onToken, resetKey }: { siteKey: string; onToken: (token: string) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken); callback.current = onToken;
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let mounted = true; let widget: string | undefined;
    setFailed(false); callback.current('');
    void load().then(() => {
      if (!mounted || !ref.current) return;
      widget = window.turnstile!.render(ref.current, { sitekey: siteKey, action: 'feedback', size: 'flexible',
        callback: (token: string) => { if (mounted) callback.current(token); },
        'expired-callback': () => callback.current(''),
        'error-callback': () => { callback.current(''); if (mounted) setFailed(true); },
      });
    }).catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; if (widget !== undefined) window.turnstile?.remove(widget); };
  }, [siteKey, resetKey, retry]);
  return <div className="feedback-challenge"><div ref={ref} />{failed && <p role="status">A verificação de envio não carregou. <button type="button" className="text-btn" onClick={() => setRetry(v => v + 1)}>Tentar novamente</button></p>}</div>;
}
