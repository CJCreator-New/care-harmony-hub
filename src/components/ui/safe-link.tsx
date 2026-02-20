import React from 'react';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/utils/sanitize';

interface SafeLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  fallbackHref?: string;
}

export function SafeLink({
  href,
  fallbackHref = '#',
  rel,
  className,
  children,
  ...props
}: SafeLinkProps) {
  const safeHref = sanitizeUrl(href) || fallbackHref;
  const isExternal = /^https?:\/\//i.test(safeHref);
  const safeRel = isExternal
    ? rel
      ? `${rel} noopener noreferrer`
      : 'noopener noreferrer'
    : rel;

  return (
    <a href={safeHref} rel={safeRel} className={cn(className)} {...props}>
      {children}
    </a>
  );
}

