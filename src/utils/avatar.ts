export const isGeneratedAvatar = (photoUrl?: string | null): boolean => {
  if (!photoUrl) return true;
  const value = photoUrl.toLowerCase();
  return value.includes('api.dicebear.com/')
    || value.includes('images.unsplash.com/photo-1590031905406')
    || value.includes('images.unsplash.com/photo-1500648767791')
    || value.includes('placeholder_avatar');
};

export const getMemberInitials = (name?: string): string =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
