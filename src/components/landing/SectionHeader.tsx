import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** Small uppercase label above the title (rendered with the .eyebrow style). */
  eyebrow?: string;
  /** Main heading — uses the display typeface. */
  title: React.ReactNode;
  /** Optional supporting lead paragraph below the title. */
  description?: React.ReactNode;
  /** Horizontal alignment of the block. Defaults to centered. */
  align?: 'center' | 'left';
  className?: string;
  titleClassName?: string;
}

/**
 * Shared section header for the marketing landing page.
 * Standardizes the eyebrow + display heading + lead pattern and a single
 * scroll-triggered fade-up so every section reads with the same rhythm.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className={cn(
        'mb-14 max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && <span className="eyebrow text-primary block mb-3">{eyebrow}</span>}
      <h2
        className={cn(
          'font-display font-normal text-3xl md:text-4xl tracking-tight text-balance',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn('lead mt-4', align === 'center' && 'mx-auto')}>{description}</p>
      )}
    </motion.div>
  );
}
