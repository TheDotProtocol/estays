export function normalizeRoomName(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function captionMatchesRoom(caption: string, roomName: string): boolean {
  const cap = normalizeRoomName(caption);
  const name = normalizeRoomName(roomName);
  if (!cap) return false;
  if (cap === name || name.includes(cap) || cap.includes(name)) return true;
  const capWords = cap.split(' ').filter((w) => w.length > 2);
  const nameWords = name.split(' ').filter((w) => w.length > 2);
  return capWords.some((cw) => nameWords.some((nw) => nw.includes(cw) || cw.includes(nw)));
}

export function resolveRoomImagesFromHotel(
  roomName: string,
  imageUrl: string | null | undefined,
  galleryUrls: string[] | null | undefined,
  hotelImages: { url: string; caption?: string | null }[]
): string[] {
  const fromDb = (galleryUrls || []).filter(Boolean);
  if (fromDb.length) return [...new Set(fromDb)];

  const matched = hotelImages
    .filter((img) => captionMatchesRoom(img.caption || '', roomName))
    .map((img) => img.url);
  const unique = [...new Set(matched)];
  if (imageUrl && !unique.includes(imageUrl)) unique.unshift(imageUrl);
  return unique;
}

export function buildRoomFeatureTags(input: {
  bedType?: string | null;
  features?: string[] | null;
  description?: string | null;
  maxOccupancy: number;
}): string[] {
  const tags: string[] = [];
  if (input.bedType) tags.push(input.bedType);
  if (input.features?.length) tags.push(...input.features);

  const desc = input.description || '';
  const sizeMatch = desc.match(/\d+\s*m²[^,]*/i) || desc.match(/\d+\s*ft²[^,]*/i);
  if (sizeMatch) tags.push(sizeMatch[0].trim());

  tags.push(`${input.maxOccupancy} adults`);

  const defaults = ['Non-smoking', 'Free WiFi', 'Instant confirmation'];
  for (const d of defaults) {
    if (!tags.some((t) => t.toLowerCase().includes(d.toLowerCase().slice(0, 8)))) {
      tags.push(d);
    }
  }

  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 10);
}

export function formatStayDateLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
