import React, { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

interface RecurrencePickerProps {
  value: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'quarterly' | 'semiannually' | 'custom';
  interval?: number;
  customUnit?: 'days' | 'weeks' | 'months' | 'years';
  onChange: (val: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'quarterly' | 'semiannually' | 'custom';
    interval?: number;
    customUnit?: 'days' | 'weeks' | 'months' | 'years';
  }) => void;
}

export const RecurrencePicker: React.FC<RecurrencePickerProps> = ({
  value,
  interval = 1,
  customUnit = 'days',
  onChange
}) => {
  const [showCustomOptions, setShowCustomOptions] = useState(value === 'custom');

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as any;
    if (type === 'custom') {
      setShowCustomOptions(true);
      onChange({ type, interval, customUnit });
    } else {
      setShowCustomOptions(false);
      onChange({ type });
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    onChange({ type: 'custom', interval: val, customUnit });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unit = e.target.value as any;
    onChange({ type: 'custom', interval, customUnit: unit });
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 premium-glow-purple">
      <div className="flex items-center space-x-3 mb-1">
        <RefreshCw className="w-5 h-5 text-[#6C5CFF] animate-spin-slow" />
        <span className="text-sm font-bold text-white tracking-wide">Récurrence</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Fréquence</label>
          <div className="relative">
            <select
              value={value}
              onChange={handleTypeChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C5CFF] focus:ring-1 focus:ring-[#6C5CFF] transition cursor-pointer appearance-none"
            >
              <option value="none" className="bg-[#1C1830] text-white">Unique (Aucune)</option>
              <option value="daily" className="bg-[#1C1830] text-white">Chaque jour (Quotidien)</option>
              <option value="weekly" className="bg-[#1C1830] text-white">Chaque semaine (Hebdomadaire)</option>
              <option value="monthly" className="bg-[#1C1830] text-white">Chaque mois (Mensuel)</option>
              <option value="quarterly" className="bg-[#1C1830] text-white">Chaque trimestre (Trimestriel)</option>
              <option value="semiannually" className="bg-[#1C1830] text-white">Chaque semestre (Semestriel)</option>
              <option value="yearly" className="bg-[#1C1830] text-white">Chaque année (Annuel)</option>
              <option value="custom" className="bg-[#1C1830] text-white">Personnalisé...</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </div>

        {showCustomOptions && (
          <div className="grid grid-cols-2 gap-3 pt-2 animate-fade-in border-t border-white/5">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Tous les</label>
              <input
                type="number"
                min="1"
                value={interval}
                onChange={handleIntervalChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C5CFF] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Période</label>
              <select
                value={customUnit}
                onChange={handleUnitChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C5CFF] transition cursor-pointer appearance-none"
              >
                <option value="days" className="bg-[#1C1830] text-white">Jours</option>
                <option value="weeks" className="bg-[#1C1830] text-white">Semaines</option>
                <option value="months" className="bg-[#1C1830] text-white">Mois</option>
                <option value="years" className="bg-[#1C1830] text-white">Années</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
