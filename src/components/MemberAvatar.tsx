import { useState, type CSSProperties } from 'react';
import { UserRound } from 'lucide-react';
import { getMemberInitials, isGeneratedAvatar } from '../utils/avatar';

interface MemberAvatarProps {
  name?: string;
  photoUrl?: string | null;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
}

export function MemberAvatar({
  name,
  photoUrl,
  className = 'h-10 w-10',
  imageClassName = '',
  style
}: MemberAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageFailed = Boolean(photoUrl && failedUrl === photoUrl);

  if (!isGeneratedAvatar(photoUrl) && !imageFailed) {
    return (
      <img
        src={photoUrl || undefined}
        alt={name ? `Photo de ${name}` : 'Photo de profil'}
        className={`${className} ${imageClassName} block shrink-0 aspect-square object-cover object-center`}
        style={style}
        onError={() => setFailedUrl(photoUrl || null)}
      />
    );
  }

  const initials = getMemberInitials(name);
  return (
    <span
      aria-label={name ? `Profil de ${name}` : 'Profil sans photo'}
      className={`${className} inline-flex shrink-0 aspect-square items-center justify-center overflow-hidden bg-[#6C5CFF]/15 text-[#6C5CFF] font-black`}
      style={style}
    >
      {initials || <UserRound className="h-1/2 w-1/2" />}
    </span>
  );
}
