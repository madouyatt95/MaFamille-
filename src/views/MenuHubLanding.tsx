import { lazy, Suspense, useMemo } from 'react';
import {
  BookOpen, Brush, Calendar, Camera, Car, Coins, Dog, FolderLock, Gamepad2,
  GraduationCap, HeartHandshake, HeartPulse, Home, Layers, Map, Phone, Plane,
  ShieldCheck, ShoppingCart, Users, Wrench
} from 'lucide-react';
import { PREMIUM_MODULE_FEATURES } from '../utils/premiumFeatures';
import { getDefaultPermissions } from '../types';
import type { FamilyModule, Member, ModulePermissions } from '../types';

const WidgetMeteo = lazy(() => import('../components/modules/WidgetMeteo').then(module => ({ default: module.WidgetMeteo })));

const modulePermissionKeys: Record<string, FamilyModule> = {
  conseil: 'conseil_famille', conteur: 'histoires_soir', taches: 'taches', argent: 'budget',
  games: 'jeux_famille', ecole: 'ecole', logement: 'logement', agenda: 'agenda',
  courses: 'courses', sante: 'sante', voyages: 'voyages', documents: 'documents',
  vehicules: 'vehicules', animaux: 'animaux', capsule: 'capsule_temporelle',
  contacts: 'repertoire_important', peacemaker: 'peacemaker', settings: 'parametres', carte: 'carte_familiale'
};

type Props = {
  members: Member[];
  activeMemberId: string;
  memberPermissions?: Record<string, Record<FamilyModule, ModulePermissions>>;
  taskCount: number;
  schoolTaskCount: number;
  groceryCount: number;
  documentCount: number;
  pendingVaccines: number;
  isPremium: boolean;
  onOpenModule: (moduleId: string) => void;
  onTriggerPaywall: () => void;
};

export function MenuHubLanding({
  members, activeMemberId, memberPermissions, taskCount, schoolTaskCount, groceryCount,
  documentCount, pendingVaccines, isPremium, onOpenModule, onTriggerPaywall
}: Props) {
  const permissions = useMemo(() => {
    if (memberPermissions?.[activeMemberId]) return memberPermissions[activeMemberId];
    const role = (members.find(member => member.id === activeMemberId)?.role || '').toLowerCase();
    const normalizedRole = role.includes('chef') || role.includes('admin') ? 'chef_famille'
      : role.includes('gestionnaire') ? 'gestionnaire'
        : role.includes('parent') ? 'parent'
          : role.includes('adolescent') ? 'adolescent'
            : role.includes('adulte') ? 'adulte'
              : role.includes('enfant') ? 'enfant' : 'invite';
    return getDefaultPermissions(normalizedRole);
  }, [activeMemberId, memberPermissions, members]);

  const modules = useMemo(() => [
    { id: 'conseil', title: 'Conseil de Famille', desc: 'Sondages actifs et charte de vie', badge: 'Coopération', icon: Users, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'conteur', title: 'Histoires du Soir', desc: 'Contes personnalisés interactifs', badge: 'Plus', icon: BookOpen, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'taches', title: 'Tâches', desc: 'Répartition des tâches et suivi', badge: `${taskCount} en cours`, icon: Brush, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'argent', title: 'Argent de poche', desc: 'Missions, récompenses et suivi', badge: 'Confiance', icon: Coins, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'games', title: 'Jeux en famille', desc: 'Jeux et défis à plusieurs', badge: 'Nouveau', icon: Gamepad2, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'ecole', title: 'École et devoirs', desc: 'Tuteur, devoirs et quiz', badge: `${schoolTaskCount} devoirs`, icon: GraduationCap, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'logement', title: 'Logement', desc: 'Maintenance et garanties', badge: 'Équipements', icon: Home, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'agenda', title: 'Agenda familial', desc: 'Calendrier partagé du foyer', badge: 'Calendrier', icon: Calendar, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' },
    { id: 'courses', title: 'Courses et Éco-Chef', desc: 'Liste de courses et anti-gaspi', badge: `${groceryCount} articles`, icon: ShoppingCart, color: 'text-[#FFB020] bg-[#FFB020]/10' },
    { id: 'sante', title: 'Santé', desc: 'Carnet médical et rendez-vous', badge: pendingVaccines ? `${pendingVaccines} vaccin${pendingVaccines > 1 ? 's' : ''}` : 'À jour', icon: HeartPulse, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'voyages', title: 'Voyages', desc: 'Activités et valise personnalisée', badge: 'Préparation', icon: Plane, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'documents', title: 'Documents', desc: 'Coffre-fort sécurisé', badge: `${documentCount} fichiers`, icon: FolderLock, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { id: 'vehicules', title: 'Véhicules', desc: 'Assurances et entretiens', badge: 'Garage', icon: Car, color: 'text-[#4F8CFF] bg-[#4F8CFF]/10' },
    { id: 'animaux', title: 'Animaux', desc: 'Vaccins et vétérinaire', badge: 'Compagnons', icon: Dog, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'capsule', title: 'Capsule temporelle', desc: 'Album de souvenirs et gazette', badge: 'Souvenirs', icon: Camera, color: 'text-[#FF4D6D] bg-[#FF4D6D]/10' },
    { id: 'contacts', title: 'Répertoire important', desc: 'Numéros utiles et urgences', badge: 'Urgent', icon: Phone, color: 'text-red-500 bg-red-500/10' },
    { id: 'peacemaker', title: 'Médiateur familial', desc: 'Aide à résoudre les conflits', badge: 'Médiation', icon: HeartHandshake, color: 'text-[#00D26A] bg-[#00D26A]/10' },
    { id: 'settings', title: 'Réglages', desc: "Configuration de l'application", badge: 'Système', icon: Wrench, color: 'text-white/50 bg-white/5' },
    { id: 'carte', title: 'Carte familiale', desc: 'Localisation familiale sécurisée', badge: 'En direct', icon: Map, color: 'text-[#6C5CFF] bg-[#6C5CFF]/10' }
  ].filter(module => permissions[modulePermissionKeys[module.id]]?.voir !== false), [documentCount, groceryCount, pendingVaccines, permissions, schoolTaskCount, taskCount]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-6 md:px-8 premium-glow-purple">
      <Suspense fallback={<div className="h-24 rounded-[28px] border border-white/8 bg-white/[0.03]" />}>
        <WidgetMeteo />
      </Suspense>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3 text-[#6C5CFF]"><Layers className="h-6 w-6" /></div>
          <div className="min-w-0"><h1 className="text-xl font-extrabold text-white">Espaces famille</h1><p className="text-xs font-medium text-white/50">{modules.length} modules disponibles</p></div>
        </div>
        {isPremium && <span className="shrink-0 rounded-full bg-[#6C5CFF] px-3 py-1.5 text-[10px] font-black uppercase text-white">Plus</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {modules.map(module => {
          const Icon = module.icon;
          return <button key={module.id} onClick={() => {
            if (PREMIUM_MODULE_FEATURES[module.id] && !isPremium) return onTriggerPaywall();
            onOpenModule(module.id);
          }} className="glass-panel flex h-[150px] flex-col justify-between rounded-[28px] border border-white/6 p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/8">
            <div className="flex items-center justify-between gap-2"><div className={`rounded-[18px] border border-white/5 p-3 ${module.color}`}><Icon className="h-5 w-5" /></div><span className="rounded-[10px] border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 px-2.5 py-1 text-[9px] font-black uppercase text-[#6C5CFF]">{module.badge}</span></div>
            <div><h2 className="text-sm font-bold text-white">{module.title}</h2><p className="mt-1 line-clamp-2 text-[11px] font-medium text-white/50">{module.desc}</p></div>
          </button>;
        })}
      </div>
      <div className="flex items-center gap-4 rounded-[28px] border border-[#6C5CFF]/20 bg-[#101c34]/70 p-5"><div className="rounded-full border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3 text-[#6C5CFF]"><ShieldCheck className="h-6 w-6" /></div><div><h2 className="text-sm font-extrabold text-white">Données familiales protégées</h2><p className="mt-1 text-xs text-white/50">Accès privé et synchronisation sécurisée du foyer.</p></div></div>
    </div>
  );
}
