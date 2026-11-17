/** Sized image URL for Cloudinary (transform) or Unsplash (query params). */
export function img(url: string, w: number, h?: number): string {
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', `/upload/c_fill,w_${w}${h ? `,h_${h}` : ''},q_auto,f_auto/`);
  }
  if (url.includes('images.unsplash.com')) {
    const u = new URL(url);
    u.searchParams.set('w', String(w));
    if (h) u.searchParams.set('h', String(h));
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('q', '70');
    return u.toString();
  }
  return url;
}
