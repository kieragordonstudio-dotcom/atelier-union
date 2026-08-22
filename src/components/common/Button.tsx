import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonTone = 'default' | 'accent' | 'ghost' | 'dark';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  children: ReactNode;
};

export function Button({
  tone = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`button ${tone} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  tone = 'default',
  children,
}: {
  to: string;
  tone?: ButtonTone;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`button-link ${tone}`.trim()}>
      {children}
    </Link>
  );
}
