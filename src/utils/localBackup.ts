export interface LocalBackupFile {
  format: 'myfamily-local-backup';
  version: 1;
  createdAt: string;
  itemCount: number;
  data: Record<string, string>;
}

const SENSITIVE_KEY_PATTERNS = [
  /^sb-/i,
  /supabase.*auth/i,
  /(?:^|[_-])(token|secret|password|pin)(?:$|[_-])/i,
  /^mf_sb_(?:url|key)$/i,
  /^mf_fcm_/i,
  /^mf_pending_quick_/i
];

const isSafeLocalKey = (key: string): boolean => (
  key.length <= 180 && !SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))
);

export const createLocalBackup = (): LocalBackupFile => {
  const data: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !isSafeLocalKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }

  return {
    format: 'myfamily-local-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    itemCount: Object.keys(data).length,
    data
  };
};

export const downloadLocalBackup = async (backup: LocalBackupFile): Promise<boolean> => {
  const date = backup.createdAt.slice(0, 10);
  const fileName = `MyFamily-sauvegarde-${date}.json`;
  const file = new File([JSON.stringify(backup, null, 2)], fileName, { type: 'application/json' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'Sauvegarde MyFamily+', files: [file] });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }

  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(fileUrl);
  return true;
};

export const restoreLocalBackup = async (file: File): Promise<{ restored: number; createdAt: string }> => {
  if (file.size > 25 * 1024 * 1024) throw new Error('Ce fichier est trop volumineux pour une sauvegarde locale.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Ce fichier de sauvegarde est illisible.');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Ce fichier ne correspond pas à une sauvegarde MyFamily+.');
  const backup = parsed as Partial<LocalBackupFile>;
  if (backup.format !== 'myfamily-local-backup' || backup.version !== 1 || !backup.data || typeof backup.data !== 'object') {
    throw new Error('Ce format de sauvegarde n’est pas compatible.');
  }

  let restored = 0;
  Object.entries(backup.data).forEach(([key, value]) => {
    if (!isSafeLocalKey(key) || typeof value !== 'string') return;
    localStorage.setItem(key, value);
    restored += 1;
  });

  localStorage.setItem('mf_last_local_backup_at', new Date().toISOString());
  return { restored, createdAt: backup.createdAt || '' };
};
