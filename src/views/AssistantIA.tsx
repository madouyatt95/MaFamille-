import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  TrendingUp, 
  ShoppingBasket, 
  UtensilsCrossed, 
  FolderLock, 
  Sparkles,
  Mic
} from 'lucide-react';
import type { Transaction, DocumentFile, GroceryItem } from '../types';

interface AssistantIAProps {
  transactions: Transaction[];
  documents: DocumentFile[];
  groceries: GroceryItem[];
  currencySymbol?: string;
  formatMoney: (amount: number) => string;
  activeMemberId?: string;
  onAddGroceryItem?: (name: string, category: string, qty: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ia';
  text: string;
  timestamp: string;
  actionType?: 'finances' | 'courses' | 'menus' | 'documents';
}

export const AssistantIA: React.FC<AssistantIAProps> = ({
  transactions,
  documents,
  groceries,
  formatMoney,
  activeMemberId = '1',
  onAddGroceryItem
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const name = activeMemberId === '1' ? 'Papa' : activeMemberId === '2' ? 'Maman' : activeMemberId === '3' ? 'Amadou' : 'Awa';
    return [
      {
        id: 'm-init',
        sender: 'ia',
        text: `Bonjour ${name} ! Je suis votre Assistant IA MaFamille+. Je peux analyser vos finances, préparer votre liste de courses, générer vos repas ou surveiller vos documents administratifs. Comment puis-je vous aider aujourd'hui ?`,
        timestamp: 'À l\'instant'
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleVocalInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas l'API de reconnaissance vocale.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
      setTimeout(() => {
        handleSend(transcript);
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const suggestions = [
    { label: 'Résumer les dépenses', icon: TrendingUp, type: 'finances' },
    { label: 'Préparer les courses', icon: ShoppingBasket, type: 'courses' },
    { label: 'Générer les menus', icon: UtensilsCrossed, type: 'menus' },
    { label: 'Documents expirants', icon: FolderLock, type: 'documents' }
  ];

  const handleSend = (text: string, type?: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate IA Response based on text/type
    setTimeout(() => {
      let responseText = '';
      
      const promptLower = text.toLowerCase();
      
      const isAddCommand = promptLower.includes('ajoute') || promptLower.includes('ajouter') || promptLower.includes('mets') || promptLower.includes('mettre') || promptLower.includes('rajoute') || promptLower.includes('rajouter');
      
      if (isAddCommand && onAddGroceryItem) {
        // Nettoyage des verbes de début
        let cleanText = promptLower
          .replace(/^(ajoute|ajouter|mets|mettre|rajoute|rajouter)\s+/, '')
          .replace(/^(des|de\s+la|du|un|une|le|la|de|d')\s+/, '')
          .trim();
        
        // Nettoyage des suffixes de destination
        cleanText = cleanText
          .replace(/\s+(à\s+la|dans\s+la|dans\s+le|au|sur\s+la|de|à\s+ma|ma)?\s*(liste|courses|caddie|panier|commun[e]?)\s*(commune|partagée|de\s+courses)?$/, '')
          .trim();

        if (cleanText.length >= 2) {
          const formattedName = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
          
          const itemLower = cleanText.toLowerCase();
          let category = 'Épicerie';
          if (itemLower.includes('banane') || itemLower.includes('pomme') || itemLower.includes('tomate') || itemLower.includes('salade') || itemLower.includes('carotte') || itemLower.includes('avocat') || itemLower.includes('fraise') || itemLower.includes('citron') || itemLower.includes('fruit') || itemLower.includes('légume')) {
            category = 'Fruits & Légumes';
          } else if (itemLower.includes('lait') || itemLower.includes('beurre') || itemLower.includes('fromage') || itemLower.includes('yaourt') || itemLower.includes('crème')) {
            category = 'Produits Frais';
          } else if (itemLower.includes('pain') || itemLower.includes('baguette') || itemLower.includes('croissant') || itemLower.includes('pain de mie')) {
            category = 'Épicerie';
          } else if (itemLower.includes('poulet') || itemLower.includes('viande') || itemLower.includes('steak') || itemLower.includes('jambon') || itemLower.includes('saumon') || itemLower.includes('poisson') || itemLower.includes('sardine')) {
            category = 'Boucherie';
          }

          onAddGroceryItem(formattedName, category, '1 pièce');
          responseText = `🛒 C'est fait ! J'ai ajouté **"${formattedName}"** dans la catégorie *${category}* à votre liste de courses commune.`;
        } else {
          responseText = "🤔 Je n'ai pas bien compris quel article vous souhaitez ajouter aux courses.";
        }
      }
      else if (type === 'finances' || promptLower.includes('dépense') || promptLower.includes('budget') || promptLower.includes('financ')) {
        const totalDepenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        responseText = `Analyse financière de Mai 2026 :\n\n- Dépenses totales : ${formatMoney(totalDepenses)}.\n- Principale dépense : Alimentation (650 000 FCFA / 650 €).\n- État d'épargne : Excellent (43% de l'objectif Vacances 2026 atteint).\n\n💡 Conseil de l'IA : Vous avez réduit vos dépenses de Transport de 3% cette semaine, ce qui vous permet d'allouer plus de budget à vos objectifs d'épargne. Continuez ainsi !`;
      } 
      else if (type === 'courses' || promptLower.includes('course') || promptLower.includes('achat') || promptLower.includes('magasin')) {
        const missingItems = groceries.filter(g => !g.checked);
        const missingList = missingItems.map(g => `- ${g.name} (${g.category})`).join('\n');
        responseText = `J'ai analysé le réfrigérateur et votre liste partagée. Voici les produits manquants à acheter :\n\n${missingList || "- Aucun produit requis, les stocks sont pleins !"}\n\n🛒 J'ai également synchronisé ces éléments directement dans votre module Courses.`;
      } 
      else if (type === 'menus' || promptLower.includes('menu') || promptLower.includes('repas') || promptLower.includes('recett')) {
        responseText = `Voici une proposition de repas équilibrés pour les 3 prochains jours :\n\n- Lundi :\n  • Déjeuner : Salade de quinoa, avocat et fêta.\n  • Dîner : Velouté de légumes printaniers et croûtons de pain complet.\n- Mardi :\n  • Déjeuner : Filet de saumon grillé et riz blanc citronné.\n  • Dîner : Pâtes complètes bolognaise maison.\n- Mercredi :\n  • Déjeuner : Wrap au thon et crudités.\n  • Dîner : Quiche aux épinards et fromage de chèvre.`;
      } 
      else if (type === 'documents' || promptLower.includes('document') || promptLower.includes('cni') || promptLower.includes('passport') || promptLower.includes('expir')) {
        const expiringDocs = documents.filter(d => d.expiryDate && !d.isExpired);
        const docsList = expiringDocs.map(d => `- ${d.name} (Expire le ${d.expiryDate})`).join('\n');
        responseText = `Alerte de sécurité de votre coffre-fort numérique :\n\n${docsList || "- Aucun document critique à renouveler sous peu."}\n\n⚠️ Action requise : Je vous recommande de prendre rendez-vous en mairie dès cette semaine, les délais d'obtention étant actuellement de 4 semaines.`;
      } 
      else {
        responseText = `J'ai bien reçu votre message : "${text}".\n\nEn tant qu'Assistant Familial, je peux exécuter des requêtes précises. Essayez de me demander un "Résumé des dépenses", de "Préparer les courses" ou de "Générer les menus" pour que j'analyse vos données en temps réel !`;
      }

      const iaMsg: Message = {
        id: `ia-${Date.now()}`,
        sender: 'ia',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, iaMsg]);
      setIsTyping(false);
    }, 1500);
  };


  return (
    <div className="pb-32 pt-6 px-4 md:px-8 flex flex-col h-[85vh] max-w-3xl mx-auto premium-glow-purple">
      
      {/* Head */}
      <div className="flex items-center space-x-3 border-b border-white/8 pb-4 shrink-0">
        <div className="p-3 rounded-2xl bg-[#6C5CFF]/15 text-[#6C5CFF] border border-[#6C5CFF]/20 relative">
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#00D26A] border-2 border-[#07111F] rounded-full"></span>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
            Assistant IA MaFamille+
            <Sparkles className="w-4 h-4 text-[#FFB020]" />
          </h1>
          <p className="text-xs text-white/50 font-medium">Analyse et suggestions familiales intelligentes</p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4 no-scrollbar pr-1">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {msg.sender === 'ia' && (
                <div className="p-2 rounded-xl bg-[#6C5CFF]/15 text-[#6C5CFF] border border-[#6C5CFF]/20 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              
              <div className={`p-4 rounded-[24px] border ${
                msg.sender === 'user'
                  ? 'bg-[#6C5CFF] border-[#6C5CFF]/20 text-white rounded-tr-sm shadow-md'
                  : 'glass-panel border-white/8 text-white rounded-tl-sm'
              }`}>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">{msg.text}</p>
                <span className="text-[9px] text-white/30 block text-right mt-2 font-bold tracking-wider">{msg.timestamp}</span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-[80%]">
              <div className="p-2 rounded-xl bg-[#6C5CFF]/15 text-[#6C5CFF] border border-[#6C5CFF]/20">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass-panel rounded-[24px] border border-white/8 p-4 rounded-tl-sm flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce delay-100"></span>
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips (horizontal scroll) */}
      <div className="px-1 py-3 border-t border-white/5 flex space-x-2 overflow-x-auto no-scrollbar shrink-0">
        {suggestions.map((sug, idx) => {
          const SugIcon = sug.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(sug.label, sug.type)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/8 text-xs font-semibold text-white/80 hover:text-white hover:bg-[#6C5CFF]/10 hover:border-[#6C5CFF]/30 transition-all shrink-0 cursor-pointer"
            >
              <SugIcon className="w-3.5 h-3.5 text-[#6C5CFF]" />
              <span>{sug.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="glass-panel rounded-[24px] border border-white/8 p-2 flex items-center space-x-2 shrink-0">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
          placeholder="Demandez-moi n'importe quoi sur la famille..." 
          className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none"
        />
        <button 
          onClick={handleVocalInput}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            isListening 
              ? 'bg-[#FF4D6D] border-[#FF4D6D]/30 text-white animate-pulse shadow-[0_0_15px_rgba(255,77,109,0.5)]' 
              : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleSend(inputValue)}
          className="p-3 rounded-2xl bg-[#6C5CFF] text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
