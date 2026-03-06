import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wraps dashboard page content with an orchestrated stagger entrance animation.
 * Each direct child animates in with a 70ms delay gap — stats cards, chart panels,
 * and activity feeds each appear in sequence rather than all at once.
 *
 * Usage:
 *   <DashboardPageTransition>
 *     <StatsGrid />
 *     <ChartsSection />
 *   </DashboardPageTransition>
 */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1], // custom spring-feel ease-out
    },
  },
};

interface DashboardPageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container — wraps the whole page; staggering is driven by this component.
 */
export function DashboardPageTransition({
  children,
  className,
}: DashboardPageTransitionProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

/**
 * Item — each direct section (stats grid, charts row, etc.) should be wrapped
 * in this so it participates in the stagger sequence.
 */
export function DashboardSection({
  children,
  className,
}: DashboardPageTransitionProps) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * StaggerGrid — wraps a grid of cards so each card staggers inside the grid.
 * Nested stagger: parent section staggered by DashboardPageTransition,
 * then cards within the grid stagger a second time at 60ms intervals.
 */
const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0,
    },
  },
};

export function StaggerGrid({
  children,
  className,
}: DashboardPageTransitionProps) {
  return (
    <motion.div className={className} variants={gridContainerVariants}>
      {children}
    </motion.div>
  );
}

/**
 * StaggerGridItem — each card inside a StaggerGrid.
 */
export function StaggerGridItem({
  children,
  className,
}: DashboardPageTransitionProps) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
