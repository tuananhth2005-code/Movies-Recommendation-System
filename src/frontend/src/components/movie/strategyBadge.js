
export function getStrategyBadge(strategy, sources = {}) {
  switch (strategy) {
    case 'hybrid':
      return {
        label: 'AI Hybrid',
        tooltip: `Combined: MF (${sources.mf || 0}) + CF (${sources.cf || 0}) + Watched (${sources.watched || 0})`,
        bg: 'rgba(159,255,136,0.14)',
        color: 'var(--primary)',
        border: 'rgba(159,255,136,0.30)',
      };
    case 'partial_hybrid':
      return {
        label: 'Hybrid',
        tooltip: `Sources: MF=${sources.mf || 0}, CF=${sources.cf || 0}, Watched=${sources.watched || 0}`,
        bg: 'rgba(0,210,253,0.14)',
        color: 'var(--secondary)',
        border: 'rgba(0,210,253,0.30)',
      };
    case 'watched_only':
    case 'watched_based':
      return {
        label: 'From Watched',
        tooltip: 'Based on movies you have watched',
        bg: 'rgba(255,180,80,0.14)',
        color: '#ffb450',
        border: 'rgba(255,180,80,0.30)',
      };
    case 'cold_start':
      return {
        label: 'Curated',
        tooltip: 'Top picks based on your preferred genres',
        bg: 'rgba(180,160,255,0.14)',
        color: '#b4a0ff',
        border: 'rgba(180,160,255,0.30)',
      };
    default:
      return null;
  }
}

export function getStrategySubtitle(strategy, sources = {}, seedCount = null) {
  switch (strategy) {
    case 'hybrid':
      return `Powered by Matrix Factorization, Collaborative Filtering & your watch history`;
    case 'partial_hybrid':
      return `Smart blend of available signals (${Object.entries(sources)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')})`;
    case 'watched_only':
      return 'Based purely on movies you have watched';
    case 'watched_based':
      return seedCount
        ? `Inspired by ${seedCount} ${seedCount === 1 ? 'movie' : 'movies'} you have watched`
        : 'Inspired by your watch history';
    case 'cold_start':
      return 'Curated from your preferred genres — start watching to get personalized picks';
    default:
      return null;
  }
}
