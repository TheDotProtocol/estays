/** Request smaller CDN variants where Agoda/Bstatic support size params. */
export function optimizeCdnImageUrl(url: string, size = '640x480'): string {
  if (!url) return url;
  let optimized = url.replace(/840x460/g, '640x480');
  if (/[?&]s=\d+x\d+/i.test(optimized)) {
    optimized = optimized.replace(/([?&]s=)\d+x\d+/i, `$1${size}`);
  } else if (optimized.includes('agoda.net') || optimized.includes('bstatic.com')) {
    optimized += optimized.includes('?') ? `&s=${size}` : `?s=${size}`;
  }
  return optimized.replace(/;$/, '');
}

export function thumbnailImageUrl(url: string): string {
  return optimizeCdnImageUrl(url, '400x300');
}
