export function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const cleanContent = content || '';
  const wordCount = cleanContent.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
