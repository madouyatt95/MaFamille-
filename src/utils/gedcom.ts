import type { FamilyTreeProfile, FamilyTreeRelationship } from '../services/familyRootsService';

export type GedcomPerson = {
  ref: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
};

export type GedcomLink = {
  sourceRef: string;
  targetRef: string;
  type: 'parent' | 'conjoint';
};

const parseGedcomDate = (value: string): string | undefined => {
  const clean = value.replace(/^(ABT|BEF|AFT|EST)\s+/i, '').trim();
  const match = clean.match(/^(?:(\d{1,2})\s+)?([A-Z]{3})?\s*(\d{4})$/i);
  if (!match) return undefined;
  const months: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const year = match[3];
  const month = match[2] ? months[match[2].toUpperCase()] || 1 : 1;
  const day = match[1] ? Number(match[1]) : 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const gedcomDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const parseGedcom = (content: string): { people: GedcomPerson[]; links: GedcomLink[] } => {
  const lines = content.replace(/\r/g, '').split('\n');
  const people = new Map<string, GedcomPerson>();
  const families: Array<{ husband?: string; wife?: string; children: string[] }> = [];
  let person: GedcomPerson | undefined;
  let family: { husband?: string; wife?: string; children: string[] } | undefined;
  let dateTarget: 'birthDate' | 'deathDate' | undefined;

  for (const line of lines) {
    const individual = line.match(/^0\s+(@[^@]+@)\s+INDI$/);
    const familyStart = line.match(/^0\s+(@[^@]+@)\s+FAM$/);
    if (individual) {
      person = { ref: individual[1], name: 'Personne sans nom' };
      people.set(person.ref, person);
      family = undefined;
      dateTarget = undefined;
      continue;
    }
    if (familyStart) {
      family = { children: [] };
      families.push(family);
      person = undefined;
      dateTarget = undefined;
      continue;
    }
    if (person) {
      const name = line.match(/^1\s+NAME\s+(.+)$/);
      if (name) person.name = name[1].replace(/\//g, '').replace(/\s+/g, ' ').trim();
      if (/^1\s+BIRT/.test(line)) dateTarget = 'birthDate';
      else if (/^1\s+DEAT/.test(line)) dateTarget = 'deathDate';
      const date = line.match(/^2\s+DATE\s+(.+)$/);
      if (date && dateTarget) person[dateTarget] = parseGedcomDate(date[1]);
    }
    if (family) {
      const husband = line.match(/^1\s+HUSB\s+(@[^@]+@)$/);
      const wife = line.match(/^1\s+WIFE\s+(@[^@]+@)$/);
      const child = line.match(/^1\s+CHIL\s+(@[^@]+@)$/);
      if (husband) family.husband = husband[1];
      if (wife) family.wife = wife[1];
      if (child) family.children.push(child[1]);
    }
  }

  const links: GedcomLink[] = [];
  for (const item of families) {
    if (item.husband && item.wife) links.push({ sourceRef: item.husband, targetRef: item.wife, type: 'conjoint' });
    for (const child of item.children) {
      if (item.husband) links.push({ sourceRef: item.husband, targetRef: child, type: 'parent' });
      if (item.wife) links.push({ sourceRef: item.wife, targetRef: child, type: 'parent' });
    }
  }
  return { people: [...people.values()].slice(0, 250), links: links.slice(0, 500) };
};

export const exportGedcom = (profiles: FamilyTreeProfile[], relationships: FamilyTreeRelationship[]): string => {
  const visible = profiles.filter(profile => profile.isLocal && profile.visibility !== 'masque');
  const refs = new Map(visible.map((profile, index) => [profile.id, `@I${index + 1}@`]));
  const lines = ['0 HEAD', '1 SOUR MyFamilyPlus', '1 CHAR UTF-8'];
  visible.forEach(profile => {
    const ref = refs.get(profile.id);
    lines.push(`0 ${ref} INDI`, `1 NAME ${profile.displayName.replace(/\//g, ' ')}`);
    if (profile.birthDate) lines.push('1 BIRT', `2 DATE ${gedcomDate(profile.birthDate)}`);
    if (profile.deathDate || profile.isMemorial) {
      lines.push('1 DEAT');
      if (profile.deathDate) lines.push(`2 DATE ${gedcomDate(profile.deathDate)}`);
    }
  });

  const parentLinks = relationships.filter(link => link.relationshipType === 'parent' && refs.has(link.sourceProfileId) && refs.has(link.targetProfileId));
  const partnerPairs = relationships.filter(link => link.relationshipType === 'conjoint' && refs.has(link.sourceProfileId) && refs.has(link.targetProfileId));
  const usedPartners = new Set<string>();
  let familyIndex = 1;
  for (const relation of parentLinks) {
    const familyRef = `@F${familyIndex++}@`;
    lines.push(`0 ${familyRef} FAM`, `1 HUSB ${refs.get(relation.sourceProfileId)}`, `1 CHIL ${refs.get(relation.targetProfileId)}`);
  }
  for (const relation of partnerPairs) {
    const key = [relation.sourceProfileId, relation.targetProfileId].sort().join(':');
    if (usedPartners.has(key)) continue;
    usedPartners.add(key);
    lines.push(`0 @F${familyIndex++}@ FAM`, `1 HUSB ${refs.get(relation.sourceProfileId)}`, `1 WIFE ${refs.get(relation.targetProfileId)}`);
  }
  lines.push('0 TRLR');
  return lines.join('\n');
};
