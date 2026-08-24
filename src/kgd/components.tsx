import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function KgdPage({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="kgd-page">
      <header className="kgd-page-header">
        <div>
          <p className="kgd-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="kgd-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function KgdModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="kgd-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`kgd-modal ${wide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="kgd-modal-header">
          <h2>{title}</h2>
          <button className="kgd-icon-button" type="button" onClick={onClose} title="Close">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="kgd-modal-body">{children}</div>
      </section>
    </div>
  );
}

export function KgdEmpty({ children }: { children: ReactNode }) {
  return <div className="kgd-empty">{children}</div>;
}

export function KgdStatus({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p className={`kgd-status ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>
      {message}
    </p>
  );
}

export function money(pence: number | string | null | undefined) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: Number(pence) % 100 === 0 ? 0 : 2,
  }).format(Number(pence ?? 0) / 100);
}

export function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function dateOnly(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
