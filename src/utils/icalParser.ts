/**
 * Parseur iCal/ICS ultra-robuste et tolérant aux pannes
 * Permet d'importer des fichiers de calendriers externes (Google Calendar, Apple ICS, Outlook, Emplois du temps)
 */

export interface ExternalEvent {
  id: string;
  title: string;
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;
  startTime?: string; // HH:MM
  endTime?: string;
  description?: string;
  location?: string;
  sourceName: string;
  sourceColor: string;
  memberId?: string; // Si associé à un enfant pour l'école
  isAllDay: boolean;
}

/**
 * Convertit une chaîne de date ICS (ex: "20260522T143000Z" ou "20260522") en date JS
 */
export const parseIcsDate = (icsStr: string): Date | null => {
  if (!icsStr) return null;
  
  // Nettoyage rapide
  const cleanStr = icsStr.replace(/[^0-9TZ]/g, '');
  
  try {
    let dateObj: Date | null = null;
    
    // Cas 1 : Date seule sans heure (YYYYMMDD)
    if (cleanStr.length === 8) {
      const y = parseInt(cleanStr.substring(0, 4));
      const m = parseInt(cleanStr.substring(4, 6)) - 1;
      const d = parseInt(cleanStr.substring(6, 8));
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        dateObj = new Date(y, m, d);
      }
    }
    // Cas 2 : Date avec heure (YYYYMMDDTHHMMSS)
    else if (cleanStr.length >= 15 && cleanStr.includes('T')) {
      const y = parseInt(cleanStr.substring(0, 4));
      const m = parseInt(cleanStr.substring(4, 6)) - 1;
      const d = parseInt(cleanStr.substring(6, 8));
      
      const tIdx = cleanStr.indexOf('T');
      const hh = parseInt(cleanStr.substring(tIdx + 1, tIdx + 3));
      const mm = parseInt(cleanStr.substring(tIdx + 3, tIdx + 5));
      const ss = parseInt(cleanStr.substring(tIdx + 5, tIdx + 7));
      
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && !isNaN(hh) && !isNaN(mm) && !isNaN(ss)) {
        if (icsStr.endsWith('Z')) {
          dateObj = new Date(Date.UTC(y, m, d, hh, mm, ss));
        } else {
          dateObj = new Date(y, m, d, hh, mm, ss);
        }
      }
    } else {
      const parsed = new Date(icsStr);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj;
    }
  } catch (err) {
    console.warn("Erreur de parsing de date iCal pour la valeur :", icsStr, err);
  }
  
  return null;
};

/**
 * Déplie les lignes ICS pliées (folding) selon la norme RFC 5545
 */
const unfoldIcs = (icsContent: string): string => {
  // Remplace un saut de ligne suivi par un espace ou une tabulation par rien
  return icsContent.replace(/\r?\n[ \t]/g, '');
};

/**
 * Analyse et extrait les événements d'un fichier ICS brut
 */
export const parseICSContent = (
  rawContent: string, 
  sourceName: string, 
  sourceColor: string, 
  memberId?: string
): ExternalEvent[] => {
  const events: ExternalEvent[] = [];
  const warnings: string[] = [];
  if (!rawContent) return events;

  const unfolded = unfoldIcs(rawContent);
  const lines = unfolded.split(/\r?\n/);
  
  let currentEvent: Partial<ExternalEvent> | null = null;
  let inVevent = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Début d'événement
    if (line.toUpperCase() === 'BEGIN:VEVENT') {
      currentEvent = {
        id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceName,
        sourceColor,
        memberId,
        isAllDay: false
      };
      inVevent = true;
      continue;
    }

    // Fin d'événement
    if (line.toUpperCase() === 'END:VEVENT') {
      if (currentEvent) {
        if (currentEvent.title && currentEvent.startDate) {
          // Assurer une date de fin par défaut
          if (!currentEvent.endDate) {
            currentEvent.endDate = currentEvent.startDate;
            currentEvent.endTime = currentEvent.startTime;
          }
          events.push(currentEvent as ExternalEvent);
        } else {
          const evTitle = currentEvent.title || "Sans titre";
          warnings.push(`Événement "${evTitle}" ignoré : date ou titre manquant.`);
        }
      }
      currentEvent = null;
      inVevent = false;
      continue;
    }

    if (inVevent && currentEvent) {
      // Séparation clé / valeur
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const keyPart = line.substring(0, colonIdx);
      let valuePart = line.substring(colonIdx + 1);

      // Traitement des antislashs pour échapper les caractères spéciaux
      valuePart = valuePart
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\n/g, '\n')
        .replace(/\\N/g, '\n');

      // Nettoyage de la clé (peut contenir des paramètres comme SUMMARY;LANGUAGE=fr-FR)
      const cleanKey = keyPart.split(';')[0].toUpperCase();

      switch (cleanKey) {
        case 'SUMMARY':
          currentEvent.title = valuePart.trim();
          break;
          
        case 'DESCRIPTION':
          currentEvent.description = valuePart.trim();
          break;
          
        case 'LOCATION':
          currentEvent.location = valuePart.trim();
          break;

        case 'DTSTART': {
          const startDateObj = parseIcsDate(valuePart);
          if (startDateObj && !isNaN(startDateObj.getTime())) {
            currentEvent.startDate = startDateObj.toISOString().split('T')[0];
            // Est-ce une journée complète ? (La valeur ne contient pas 'T' et fait 8 caractères)
            if (!valuePart.includes('T')) {
              currentEvent.isAllDay = true;
            } else {
              currentEvent.startTime = startDateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          } else {
            warnings.push(`Date de début invalide pour l'événement "${currentEvent.title || 'Sans titre'}" (valeur: ${valuePart}).`);
          }
          break;
        }

        case 'DTEND': {
          const endDateObj = parseIcsDate(valuePart);
          if (endDateObj && !isNaN(endDateObj.getTime())) {
            currentEvent.endDate = endDateObj.toISOString().split('T')[0];
            if (valuePart.includes('T')) {
              currentEvent.endTime = endDateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          }
          break;
        }
      }
    }
  }

  // Enregistrer le rapport d'import s'il y a des warnings
  if (typeof window !== 'undefined' && window.localStorage) {
    if (warnings.length > 0) {
      try {
        const existingReports = JSON.parse(window.localStorage.getItem('mf_ical_import_report') || '[]');
        const updated = [...existingReports, ...warnings].slice(-50);
        window.localStorage.setItem('mf_ical_import_report', JSON.stringify(updated));
      } catch (e) {
        console.error("Erreur enregistrement rapport import:", e);
      }
    }
  }

  return events;
};

/**
 * Récupère le contenu d'une URL iCal externe via un proxy CORS transparent et l'analyse
 */
export const fetchExternalCalendar = async (
  url: string,
  sourceName: string,
  sourceColor: string,
  memberId?: string
): Promise<ExternalEvent[]> => {
  try {
    const apiRoute = import.meta.env.DEV 
      ? 'https://ma-famille-nu.vercel.app/api/ical' 
      : '/api/ical';

    let text = '';
    try {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (response.ok) {
        const json = await response.json();
        text = json.data || '';
      } else {
        throw new Error();
      }
    } catch {
      // Fallback in case of server route issues (e.g. localhost dev without vercel dev)
      const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxiedUrl);
      if (!response.ok) {
        throw new Error();
      }
      text = await response.text();
    }

    if (!text || !text.includes('BEGIN:VCALENDAR')) {
      throw new Error();
    }
    
    return parseICSContent(text, sourceName, sourceColor, memberId);
  } catch (err) {
    console.error("Impossible de récupérer ou de parser le calendrier externe :", url, err);
    throw new Error("Impossible d’importer ce calendrier. Vérifiez l’URL ou réessayez.", { cause: err });
  }
};
