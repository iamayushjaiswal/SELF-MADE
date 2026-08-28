import { SendSpinner, SendSuccessIcon } from './EmailSendAnimation';

export default function SendEmailButton({ status = 'idle', onSend }) {
  const isDisabled = status === 'sending' || status === 'success';

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onSend}
      className={`send-email-btn group inline-flex items-center gap-1.5 text-xs font-semibold transition ${
        isDisabled ? 'cursor-default' : 'text-cyan-700 hover:text-cyan-900'
      }`}
    >
      {status === 'sending' && (
        <>
          <SendSpinner className="h-3.5 w-3.5" />
          <span>Sending...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <SendSuccessIcon className="h-3.5 w-3.5" />
          <span className="text-emerald-700">Sent!</span>
        </>
      )}
      {status === 'idle' && (
        <>
          <svg className="h-3.5 w-3.5 transition group-hover:send-icon-wiggle" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Send Email</span>
        </>
      )}
    </button>
  );
}
