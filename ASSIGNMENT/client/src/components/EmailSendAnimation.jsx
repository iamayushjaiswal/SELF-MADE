export function SendSpinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function SendSuccessIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={`send-check-pop ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
      <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" />
    </svg>
  );
}

export function FlyingEnvelope() {
  return (
    <div className="email-fly-wrap pointer-events-none" aria-hidden="true">
      <svg className="email-fly-icon h-8 w-8 text-cyan-600" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function EmailSentToast({ show, message, tone = 'success', leaving = false }) {
  if (!show) return null;

  return (
    <div className={`email-toast email-toast-${tone} ${leaving ? 'email-toast-leaving' : ''}`} role="status">
      <FlyingEnvelope />
      <div>
        <p className="font-semibold">{tone === 'success' ? 'Email sent!' : 'Send failed'}</p>
        {message && <p className="text-xs opacity-90">{message}</p>}
      </div>
    </div>
  );
}
