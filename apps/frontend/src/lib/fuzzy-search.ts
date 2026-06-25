/**
 * Simple fuzzy search implementation
 */
export interface SearchItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
}

/**
 * Calculates fuzzy match score between query and text
 * Returns score > 0 if match found, 0 otherwise
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  if (q.length === 0) return 1;
  if (t.length === 0) return 0;
  
  let score = 0;
  let queryIdx = 0;
  let charPosition = 0;
  
  for (let i = 0; i < t.length; i++) {
    if (q[queryIdx] === t[i]) {
      score += Math.max(1, 10 - charPosition);
      queryIdx++;
      charPosition = 0;
      
      if (queryIdx === q.length) {
        return score;
      }
    } else {
      charPosition++;
    }
  }
  
  return queryIdx === q.length ? score : 0;
}

/**
 * Fuzzy search through items
 */
export function fuzzySearch<T extends SearchItem>(
  items: T[],
  query: string,
  maxResults = 10,
): T[] {
  if (!query.trim()) {
    return items.slice(0, maxResults);
  }
  
  return items
    .map(item => ({
      item,
      score: Math.max(
        fuzzyScore(query, item.title),
        item.description ? fuzzyScore(query, item.description) : 0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ item }) => item);
}
