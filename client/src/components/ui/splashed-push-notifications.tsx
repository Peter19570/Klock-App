import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';

export type NotificationType = 'help' | 'success' | 'warning' | 'error';

export interface SplashedPushNotificationsHandle {
  createNotification: (type: NotificationType, title: string, content: string) => void;
}

export interface SplashedPushNotificationsProps {
  timerColor?: string;
  timerBgColor?: string;
}

const ICON_SVGS: Record<NotificationType, string> = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`,
  help: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg>`,
};

const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

export const SplashedPushNotifications = forwardRef<SplashedPushNotificationsHandle, SplashedPushNotificationsProps>(
  ({ timerColor, timerBgColor }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (document.getElementById('splashed-toast-css')) return;
      const style = document.createElement('style');
      style.id = 'splashed-toast-css';
      style.innerHTML = `
        .notificationContainer { display:flex; flex-direction:column; align-items:flex-end; position:fixed; bottom:16px; right:16px; max-width:355px; z-index:999999; gap:8px; }
        .toast { color:#f5f5f5; padding:1rem 2rem 1.5rem 6rem; text-align:left; position:relative; font-family:'Poppins',sans-serif; font-weight:500; overflow:visible; border-radius:0.5rem; box-shadow:0 8px 32px rgba(0,0,0,0.18); }
        .toast:before { content:""; position:absolute; width:5.5rem; height:6rem; --drop:radial-gradient(circle at 64% 51%,var(--clr) 0.45rem,#fff0 calc(0.45rem + 1px)),radial-gradient(circle at 100% 100%,#fff0 0.9rem,var(--clr) calc(0.9rem + 1px) 1.25rem,#fff0 calc(1.25rem + 1px) 100%),radial-gradient(circle at 0% 0%,#fff0 0.9rem,var(--clr) calc(0.9rem + 1px) 1.25rem,#fff0 calc(1.25rem + 1px) 100%),radial-gradient(circle at 0% 120%,var(--clr) 4rem,#fff0 calc(4rem + 1px)); background:radial-gradient(circle at 22% 3.8rem,var(--clr) 0.75rem,#fff0 calc(0.75rem + 1px)),radial-gradient(circle at 0% 120%,var(--clr) 4rem,#fff0 calc(4rem + 1px)),var(--drop),#f000; background-repeat:no-repeat; background-size:100% 100%,100% 100%,100% 100%,100% 100%; bottom:0; left:0; z-index:0; border-radius:1rem 0 0 1rem; }
        .toast:after { content:""; position:absolute; width:3.5rem; height:3.5rem; background:var(--clr); top:-1.75rem; left:2rem; border-radius:3rem; }
        .toast .icon-center { position:absolute; width:3.5rem; height:3.5rem; top:-1.75rem; left:2rem; display:flex; align-items:center; justify-content:center; z-index:2; pointer-events:none; }
        .toast h3 { font-size:1.1rem; margin:0; line-height:1.35rem; position:relative; }
        .toast p { position:relative; font-size:0.875rem; z-index:1; margin:0.25rem 0 0; }
        .toast.help { --clr:#05478a; background:#0070e0; }
        .toast.success { --clr:#005e38; background:#03a65a; }
        .toast.warning { --clr:#c24914; background:#fc8621; }
        .toast.error { --clr:#851d41; background:#db3056; }
        .toast .timer { position:absolute; bottom:6px; left:10%; right:10%; width:80%; height:4px; background:rgba(255,255,255,0.25); border-radius:2px; overflow:hidden; }
        .toast .timerBar { position:absolute; top:0; left:0; height:100%; width:100%; background:rgba(255,255,255,0.75); border-radius:2px; }
        .toast .closeButton { position:absolute; top:0.4rem; right:0.4rem; height:28px; width:28px; cursor:pointer; border-radius:0.3rem; background:#fff; border:none; color:#242424; display:flex; align-items:center; justify-content:center; padding:0; }
        @keyframes slideInRight { 0%{transform:translateX(120%);opacity:0} 60%{transform:translateX(-8%)} 100%{transform:translateX(0);opacity:1} }
        @keyframes slideOutRight { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(120%);opacity:0} }
      `;
      document.head.appendChild(style);
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      if (timerColor) el.style.setProperty('--splashed-toast-timer', timerColor);
      if (timerBgColor) el.style.setProperty('--splashed-toast-timer-bg', timerBgColor);
    }, [timerColor, timerBgColor]);

    const removeNotification = (notif: HTMLElement) => {
      notif.style.animation = 'slideOutRight 0.4s ease forwards';
      setTimeout(() => notif.remove(), 400);
    };

    useImperativeHandle(ref, () => ({
      createNotification(type: NotificationType, title: string, content: string) {
        if (!containerRef.current) return;
        const notif = document.createElement('div');
        notif.classList.add('toast', type);
        notif.style.animation = 'slideInRight 0.5s ease forwards';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-center';
        iconDiv.innerHTML = ICON_SVGS[type];

        const closeBtn = document.createElement('button');
        closeBtn.className = 'closeButton';
        closeBtn.innerHTML = CLOSE_SVG;
        closeBtn.onclick = () => removeNotification(notif);

        const h3 = document.createElement('h3');
        h3.textContent = title;
        const p = document.createElement('p');
        p.textContent = content;

        const timer = document.createElement('div');
        timer.className = 'timer';
        const bar = document.createElement('div');
        bar.className = 'timerBar';
        timer.appendChild(bar);

        notif.appendChild(iconDiv);
        notif.appendChild(closeBtn);
        notif.appendChild(h3);
        notif.appendChild(p);
        notif.appendChild(timer);
        containerRef.current.appendChild(notif);

        // Animate timer bar shrinking
        const uniqueId = Date.now();
        const ks = document.createElement('style');
        ks.innerHTML = `@keyframes timerShrink${uniqueId}{from{width:100%}to{width:0%}}`;
        document.head.appendChild(ks);
        bar.style.animation = `timerShrink${uniqueId} 4000ms linear forwards`;

        setTimeout(() => removeNotification(notif), 4000);
      },
    }));

    return <div ref={containerRef} className="notificationContainer" />;
  }
);

SplashedPushNotifications.displayName = 'SplashedPushNotifications';
