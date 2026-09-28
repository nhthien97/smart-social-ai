// src/lib/dateFormatter.ts

/**
 * Format date to relative time (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (date: string | Date | undefined): string => {
  if (!date) {
    console.warn('[getRelativeTime] date is empty or undefined');
    return 'Never';
  }

  try {
    const now = new Date();
    const target = new Date(date);
    
    if (isNaN(target.getTime())) {
      console.warn('[getRelativeTime] Invalid date value:', date);
      return 'Invalid date';
    }
    
    const diffMs = now.getTime() - target.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffMs / 604800000);
    const diffMonths = Math.floor(diffMs / 2592000000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;

    return target.toLocaleDateString();
  } catch (error) {
    console.error('[getRelativeTime] error:', error, 'for date:', date);
    return 'Invalid date';
  }
};

/**
 * Format date to a full readable format (e.g., "Feb 28, 2026 at 2:30 PM")
 */
export const formatFullDate = (date: string | Date | undefined): string => {
  if (!date) return 'Never';

  try {
    const target = new Date(date);
    
    if (isNaN(target.getTime())) {
      console.warn('[formatFullDate] Invalid date value:', date);
      return 'Invalid date';
    }
    
    return target.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.error('[formatFullDate] error:', error, 'for date:', date);
    return 'Invalid date';
  }
};

/**
 * Format date to both relative and full format with tooltip
 */
export const formatDateWithTooltip = (
  date: string | Date | undefined
): { relative: string; full: string } => {
  const relative = getRelativeTime(date);
  const full = formatFullDate(date);
  
  console.log('[formatDateWithTooltip]', { input: date, relative, full });
  
  return { relative, full };
};
