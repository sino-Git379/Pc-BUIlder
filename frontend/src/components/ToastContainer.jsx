import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isChat = t.type === 'chat';
        const isError = t.type === 'error' || t.type === 'urgent';
        const isSuccess = t.type === 'success';

        return (
          <div
            key={t.id}
            className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/40 rounded-xl p-3.5 shadow-xl flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isChat
                  ? 'bg-primary/15 text-primary'
                  : isError
                  ? 'bg-error-container text-on-error-container'
                  : isSuccess
                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                  : 'bg-surface-container-high text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isChat
                  ? 'mark_chat_unread'
                  : isError
                  ? 'warning'
                  : isSuccess
                  ? 'check_circle'
                  : 'notifications'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-body-sm text-body-sm font-bold text-on-surface truncate">
                  {t.title}
                </span>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-outline hover:text-on-surface p-0.5"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
              {t.subtitle && (
                <div className="font-label-sm text-label-sm text-primary font-semibold truncate">
                  {t.subtitle}
                </div>
              )}
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                {t.message}
              </p>
              {isChat && t.roomId && (
                <button
                  type="button"
                  onClick={() => {
                    dismissToast(t.id);
                    navigate(`/messages?room=${t.roomId}`);
                  }}
                  className="mt-2 px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold inline-flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <span>Reply in Messenger</span>
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
