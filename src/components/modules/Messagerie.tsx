import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Paperclip, CheckCheck, MessageCircle, Users, ArrowLeft, Search, Palette, X, Pin, PinOff, Smile, Sparkles, Play, Pause } from 'lucide-react';
import type { Member, ChatMessage, ChatGroup } from '../../types';
import { foyerService } from '../../services/foyerService';
import { aiQuotaService } from '../../services/aiQuotaService';

// Player de messages vocaux interactif et esthétique
const VoiceMessagePlayer: React.FC<{ content: string; isMe: boolean }> = ({ content, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  let audioSrc = content;
  let displayDuration = duration;

  // Rétrocompatibilité avec les anciens messages vocaux simulés
  if (content.startsWith('Audio_')) {
    const mockDur = parseInt(content.split('_')[1]?.split(':')[1]) || 12;
    return (
      <div className="flex items-center space-x-2.5 opacity-60 py-1">
        <div className={`p-2 rounded-full ${isMe ? 'bg-black/10' : 'bg-[#6C5CFF]/20'}`}>
          <Mic className="w-4 h-4 text-white/70" />
        </div>
        <span className="text-xs italic">(Simulé : {mockDur}s - Non lisible)</span>
      </div>
    );
  }

  // Si le format contient la durée "duration|base64"
  if (content.includes('|')) {
    const parts = content.split('|');
    const durSec = parseFloat(parts[0]);
    if (!isNaN(durSec)) {
      displayDuration = durSec;
    }
    audioSrc = parts.slice(1).join('|');
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(audioSrc);
      audio.preload = 'auto';
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      
      audio.addEventListener('loadedmetadata', () => {
        if (!displayDuration) {
          setDuration(audio.duration);
        }
      });
      
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error("Audio play failed:", err);
          setIsPlaying(false);
          alert("Erreur de lecture audio : Format ou codec non supporté par ce navigateur.");
        });
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = displayDuration ? (currentTime / displayDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 py-1">
      <button 
        type="button" 
        onClick={togglePlay}
        className={`p-2 rounded-full transition-all active:scale-90 flex items-center justify-center shrink-0 ${isMe ? 'bg-black/15 hover:bg-black/25 text-black' : 'bg-[#6C5CFF]/20 hover:bg-[#6C5CFF]/35 text-[#00D26A]'}`}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex flex-col min-w-[130px] justify-center">
        <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className={`h-full rounded-full ${isMe ? 'bg-black' : 'bg-[#00D26A]'}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className={`text-[9px] font-mono ${isMe ? 'text-black/60' : 'text-white/60'}`}>{formatTime(currentTime)}</span>
          <span className={`text-[9px] font-mono ${isMe ? 'text-black/60' : 'text-white/60'}`}>
            {displayDuration ? formatTime(displayDuration) : '--:--'}
          </span>
        </div>
      </div>
    </div>
  );
};

interface MessagerieProps {
  members: Member[];
  activeMemberId: string;
  groups: ChatGroup[];
  setGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialGroupId?: string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

export const Messagerie: React.FC<MessagerieProps> = ({ 
  members, 
  activeMemberId,
  groups,
  setGroups,
  messages,
  setMessages,
  initialGroupId,
  isPremium = false,
  onTriggerPaywall
}) => {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [drawColor, setDrawColor] = useState('#FF4D6D');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReactionsForId, setShowReactionsForId] = useState<string | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const activeUser = members.find(m => m.id === activeMemberId);

  const saveMessageToCloud = useCallback(async (msg: ChatMessage) => {
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!foyerId) return;
    try {
      await foyerService.upsertItem('chat_messages', foyerId, {
        id: msg.id,
        group_id: msg.groupId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        read_by: msg.readBy,
        reactions: JSON.stringify(msg.reactions || [])
      });
    } catch (err) {
      console.error("[Messagerie] Error persisting message:", err);
    }
  }, []);

  const saveGroupToCloud = useCallback(async (g: ChatGroup) => {
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!foyerId) return;
    try {
      await foyerService.upsertItem('chat_groups', foyerId, {
        id: g.id,
        name: g.name,
        is_private: g.isPrivate,
        member_ids: g.memberIds,
        last_message: g.lastMessage || null,
        last_message_time: g.lastMessageTime || null,
        pinned_message_id: g.pinnedMessageId || null
      });
    } catch (err) {
      console.error("[Messagerie] Error persisting group:", err);
    }
  }, []);

  const prevInitialGroupId = useRef<string | undefined>(undefined);

  // Initialization of groups is handled by App.tsx. 
  // We can just automatically select the first group if none is selected.
  useEffect(() => {
    if (initialGroupId && initialGroupId !== prevInitialGroupId.current) {
      setActiveGroupId(initialGroupId);
      prevInitialGroupId.current = initialGroupId;
      return;
    }
    
    if (groups.length > 0 && !activeGroupId) {
      // Find if there is any unread message in any visible group
      const unreadMessages = messages.filter(m => {
        const g = groups.find(group => group.id === m.groupId);
        if (!g) return false;
        const isParticipant = !g.isPrivate || g.memberIds.includes(activeMemberId);
        return isParticipant && !m.readBy.includes(activeMemberId);
      });

      if (unreadMessages.length > 0) {
        // Open the group with the latest unread message
        const latestUnread = unreadMessages[unreadMessages.length - 1];
        setActiveGroupId(latestUnread.groupId);
      } else {
        // Default to the first group (Famille)
        setActiveGroupId(groups[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroupId, groups]);



  // Mark group messages as read by activeMemberId
  useEffect(() => {
    if (!activeGroupId || !activeMemberId) return;
    const unreadMessages = messages.filter(m => m.groupId === activeGroupId && !m.readBy.includes(activeMemberId));
    if (unreadMessages.length > 0) {
      setMessages(prev => prev.map(m => {
        if (m.groupId === activeGroupId && !m.readBy.includes(activeMemberId)) {
          return { ...m, readBy: [...m.readBy, activeMemberId] };
        }
        return m;
      }));

      unreadMessages.forEach(m => {
        saveMessageToCloud({
          ...m,
          readBy: [...m.readBy, activeMemberId]
        });
      });
    }
  }, [activeGroupId, activeMemberId, messages, setMessages, saveMessageToCloud]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeGroupId]);

  const simulateAiResponse = async (userText: string) => {
    setIsAiTyping(true);

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      setIsAiTyping(false);
      return;
    }

    const groqKey = import.meta.env.VITE_GROQ_API_KEY || '';
    // Consomme le quota si Premium
    const useRealAI = !!groqKey && aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es l'Assistant Familial IA chaleureux, intelligent et bienveillant de l'application MaFamille+.
Aide la famille à s'organiser, cuisiner anti-gaspillage, résoudre des devoirs scolaires, ou conseille-les sur l'éducation positive.
Réponds de manière claire, concise et joyeuse en français. Utilise des émojis et des listes si cela améliore la lisibilité.
Demande de l'utilisateur : "${userText}"`;

        const response = await fetch('https://corsproxy.io/?https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.6
          })
        });

        if (!response.ok) throw new Error('Groq API call failed');
        const data = await response.json();
        let reply = data.choices?.[0]?.message?.content || '';

        const remaining = aiQuotaService.getRemainingCalls(isPremium);
        const limit = aiQuotaService.getDailyLimit();
        reply += `\n\n✨ (Réponse en direct par Groq Llama 3 • Quota restant : ${remaining}/${limit})`;

        setIsAiTyping(false);

        const aiMsg: ChatMessage = {
          id: `msg_ai_${Date.now()}`,
          groupId: 'g_ai_assistant',
          senderId: 'ai',
          senderName: 'Assistant IA',
          type: 'text',
          content: reply,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          readBy: [activeMemberId]
        };

        setMessages(prev => [...prev, aiMsg]);
        setGroups(prev => prev.map(g => g.id === 'g_ai_assistant' ? { ...g, lastMessage: aiMsg.content.substring(0, 30) + '...', lastMessageTime: aiMsg.timestamp } : g));
        return;
      } catch (err) {
        console.warn("[Messagerie] Erreur lors de l'appel Groq en direct, repli sur l'IA locale :", err);
      }
    }

    // Version locale de repli si quota dépassé ou clé manquante
    setTimeout(() => {
      setIsAiTyping(false);
      
      const query = userText.toLowerCase();
      const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
      const isQuotaFallback = isPremium && remainingCalls === 0;

      let reply = "Je suis votre Assistant Familial IA 🤖. Je peux vous aider à planifier les repas, organiser les corvées des enfants ou résoudre des questions scolaires. Que souhaitez-vous savoir ?";
      
      if (query.includes('recette') || query.includes('manger') || query.includes('cuisine') || query.includes('dîner') || query.includes('repas') || query.includes('faim')) {
        reply = "Voici une idée de recette familiale saine, économique et anti-gaspi : *Gratin de Pâtes aux Tomates & Mozzarella* 🍅🧀.\n\n• Préparation : 10 min\n• Cuisson : 15 min au four\n• Ingrédients : Pâtes penne, sauce tomate basilic, mozzarella fraîche, parmesan.\n\n• Conseil Anti-Gaspi : Vous pouvez y ajouter des restes de poulet rôti ou des légumes cuits de la veille ! Bon appétit !";
      } else if (query.includes('devoir') || query.includes('école') || query.includes('exercice') || query.includes('apprendre') || query.includes('math') || query.includes('histoire') || query.includes('classe')) {
        reply = "Besoin d'aide pour les devoirs ? 📚 Pas de panique ! L'agenda scolaire et le Tuteur IA sont vos meilleurs alliés. Pour une révision efficace :\n\n1. Divisez le travail en sessions de 25 minutes (méthode Pomodoro).\n2. Utilisez le *Générateur de Quiz IA ✨* dans l'École pour valider les acquis de manière ludique !";
      } else if (query.includes('organisation') || query.includes('tâche') || query.includes('corvée') || query.includes('ménage') || query.includes('ranger') || query.includes('lit')) {
        reply = "Pour motiver les enfants à accomplir les corvées de la maison 🧹, attribuez-leur des tâches équitablement dans le module *Tâches*. Les enfants accumulent des points de récompense qu'ils peuvent ensuite convertir dans leur tirelire !";
      } else if (query.includes('argent') || query.includes('points') || query.includes('tirelire') || query.includes('sous') || query.includes('coffre')) {
        reply = "Le module *Argent de Poche* 🪙 permet de responsabiliser les enfants. Vous pouvez y fixer des objectifs précis (ex: s'offrir un livre ou un jouet) et y ajouter des gains pour chaque tâche accomplie avec succès !";
      } else if (query.includes('vacances') || query.includes('voyage') || query.includes('valise') || query.includes('bagage') || query.includes('départ')) {
        reply = "Vous préparez un départ ? ✈️ Le module *Voyages & Valise IA* est conçu pour cela ! Renseignez la destination, la durée et la météo, et l'IA concevra instantanément la liste idéale de bagages pour chaque membre de la famille.";
      } else if (query.includes('sport') || query.includes('foot') || query.includes('danse') || query.includes('activité') || query.includes('loisir')) {
        reply = "Le sport et les activités artistiques ⚽🎨 sont essentiels pour le bien-être familial. N'hésitez pas à les planifier dans l'agenda commun de l'application afin que chacun soit au courant du planning de la semaine !";
      } else if (query.includes('sommeil') || query.includes('coucher') || query.includes('dodo') || query.includes('histoire') || query.includes('conteur')) {
        reply = "L'heure du coucher approche ? 🌙 C'est le moment idéal pour lancer le *Conteur d'Histoires IA* ! Choisissez ensemble le héros, le monde imaginaire et la morale, et laissez le Conteur Céleste concevoir un conte merveilleux et apaisant.";
      } else if (query.includes('écran') || query.includes('téléphone') || query.includes('tablette') || query.includes('jeu') || query.includes('console')) {
        reply = "La gestion des écrans 📱 est un enjeu pour toutes les familles. Le médiateur *PeaceMaker IA* propose d'excellents compromis en CNV en cas de désaccord. Nous recommandons de fixer des limites claires et de remplacer l'écran du soir par un conte audio.";
      } else if (query.includes('météo') || query.includes('climat') || query.includes('pluie') || query.includes('soleil') || query.includes('température')) {
        reply = "Pour planifier vos sorties familiales en fonction de la météo ☀️🌧️, vous pouvez utiliser le module *Voyages* qui intègre des recommandations intelligentes d'activités selon les conditions climatiques réelles !";
      } else if (query.includes('qui es-tu') || query.includes('fonctionne') || query.includes('assistant') || query.includes('aide')) {
        reply = "Je suis l'Assistant IA de MaFamille+ 🤖, un conseiller virtuel et compagnon d'organisation. Je réponds à toutes vos questions quotidiennes sur l'éducation, les recettes anti-gaspi et la gestion harmonieuse du foyer.";
      } else if (query.includes('bonjour') || query.includes('salut') || query.includes('hello') || query.includes('coucou') || query.includes('ça va')) {
        reply = "Bonjour ! Comment se passe votre journée en famille ? Comment puis-je vous aider aujourd'hui ? 🌸";
      }

      if (isQuotaFallback) {
        reply += "\n\n✨ (IA Locale simulée : votre quota quotidien d'IA réelle est épuisé !)";
      } else {
        reply += "\n\n✨ (IA Locale simulée : configurez VITE_GROQ_API_KEY dans votre fichier .env.local)";
      }
      
      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        groupId: 'g_ai_assistant',
        senderId: 'ai',
        senderName: 'Assistant IA',
        type: 'text',
        content: reply,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        readBy: [activeMemberId]
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setGroups(prev => prev.map(g => g.id === 'g_ai_assistant' ? { ...g, lastMessage: aiMsg.content.substring(0, 30) + '...', lastMessageTime: aiMsg.timestamp } : g));
    }, 1500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroupId || !activeUser) return;

    const userText = newMessage.trim();

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      groupId: activeGroupId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      type: 'text',
      content: userText,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      readBy: [activeUser.id]
    };

    setMessages(prev => [...prev, newMsg]);
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: newMsg.content, lastMessageTime: newMsg.timestamp } : g));
    setNewMessage('');

    saveMessageToCloud(newMsg);
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (activeGroup) {
      saveGroupToCloud({
        ...activeGroup,
        lastMessage: newMsg.content,
        lastMessageTime: newMsg.timestamp
      });
    }

    if (activeGroupId === 'g_ai_assistant') {
      simulateAiResponse(userText);
    }
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const existing = m.reactions || [];
        const alreadyReacted = existing.some(r => r.senderName === activeUser?.name && r.emoji === emoji);
        let updated;
        if (alreadyReacted) {
          updated = existing.filter(r => !(r.senderName === activeUser?.name && r.emoji === emoji));
        } else {
          const filtered = existing.filter(r => r.senderName !== activeUser?.name);
          updated = [...filtered, { emoji, senderName: activeUser?.name || 'Inconnu' }];
        }
        const updatedMsg = { ...m, reactions: updated };
        saveMessageToCloud(updatedMsg);
        return updatedMsg;
      }
      return m;
    }));
    setShowReactionsForId(null);
  };

  const handleTogglePinMessage = (msgId: string) => {
    if (!activeGroupId) return;
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        const isCurrentlyPinned = g.pinnedMessageId === msgId;
        const updatedGroup = { ...g, pinnedMessageId: isCurrentlyPinned ? undefined : msgId };
        saveGroupToCloud(updatedGroup);
        return updatedGroup;
      }
      return g;
    }));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId || !activeUser) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          groupId: activeGroupId,
          senderId: activeUser.id,
          senderName: activeUser.name,
          type: 'image',
          content: event.target.result as string,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          readBy: [activeUser.id]
        };
        setMessages(prev => [...prev, newMsg]);
        setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: '📷 Photo', lastMessageTime: newMsg.timestamp } : g));

        saveMessageToCloud(newMsg);
        const activeGroup = groups.find(g => g.id === activeGroupId);
        if (activeGroup) {
          saveGroupToCloud({
            ...activeGroup,
            lastMessage: '📷 Photo',
            lastMessageTime: newMsg.timestamp
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mediaRecorder;
      let selectedMimeType = '';
      
      const mimeTypes = [
        'audio/mp4',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg',
        'audio/wav'
      ];
      
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }
      
      try {
        if (selectedMimeType) {
          mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
        } else {
          mediaRecorder = new MediaRecorder(stream);
        }
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result && activeGroupId && activeUser) {
            const base64Data = event.target.result as string;
            const payload = `${recordingDuration}|${base64Data}`;

            const newMsg: ChatMessage = {
              id: `msg_${Date.now()}`,
              groupId: activeGroupId,
              senderId: activeUser.id,
              senderName: activeUser.name,
              type: 'voice',
              content: payload,
              timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              readBy: [activeUser.id]
            };
            setMessages(prev => [...prev, newMsg]);
            setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: '🎤 Message vocal', lastMessageTime: newMsg.timestamp } : g));

            saveMessageToCloud(newMsg);
            const activeGroup = groups.find(g => g.id === activeGroupId);
            if (activeGroup) {
              saveGroupToCloud({
                ...activeGroup,
                lastMessage: '🎤 Message vocal',
                lastMessageTime: newMsg.timestamp
              });
            }
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      setRecordingDuration(0);
      setIsRecording(true);
      mediaRecorder.start();

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les autorisations dans les réglages.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // --- Canvas Drawing Helpers ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = '#0A0D18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (showCanvas) {
      setTimeout(initCanvas, 50);
    }
  }, [showCanvas, initCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0A0D18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const sendDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeGroupId || !activeUser) return;
    const dataUrl = canvas.toDataURL('image/png');
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      groupId: activeGroupId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      type: 'image',
      content: dataUrl,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      readBy: [activeUser.id]
    };
    setMessages(prev => [...prev, newMsg]);
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: '🎨 Dessin', lastMessageTime: newMsg.timestamp } : g));
    setShowCanvas(false);

    saveMessageToCloud(newMsg);
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (activeGroup) {
      saveGroupToCloud({
        ...activeGroup,
        lastMessage: '🎨 Dessin',
        lastMessageTime: newMsg.timestamp
      });
    }
  };

  const handleOpenDirectMessage = (targetMember: Member) => {
    const existingGroup = groups.find(g => 
      g.isPrivate && g.memberIds.length === 2 && 
      g.memberIds.includes(activeMemberId) && g.memberIds.includes(targetMember.id)
    );
    
    if (existingGroup) {
      setActiveGroupId(existingGroup.id);
    } else {
      const newGroupId = `dm_${activeMemberId}_${targetMember.id}`;
      const newGroup: ChatGroup = {
        id: newGroupId,
        name: targetMember.name,
        isPrivate: true,
        memberIds: [activeMemberId, targetMember.id],
        lastMessage: 'Nouvelle conversation',
        lastMessageTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setGroups(prev => [...prev, newGroup]);
      setActiveGroupId(newGroupId);
      saveGroupToCloud(newGroup);
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeMessages = messages.filter(m => m.groupId === activeGroupId);

  const visibleGroups = groups.filter(g => {
    if (!g.isPrivate) return true;
    return g.memberIds.includes(activeMemberId);
  });

  // LIST VIEW
  if (!activeGroupId) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#090D1A] to-[#04060C] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 rounded-2xl border border-[#00D26A]/30 shadow-lg shadow-[#00D26A]/5">
              <MessageCircle className="w-5 h-5 text-[#00D26A]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Messages</h2>
              <p className="text-[10px] font-medium text-white/40">Connecté : {activeUser?.name}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95 text-white/70 hover:text-white border border-white/5">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <h4 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-2 mb-1">Discussions de groupe</h4>
          {visibleGroups.map(group => (
            <div 
              key={group.id} 
              onClick={() => setActiveGroupId(group.id)}
              className="flex items-center p-3.5 rounded-2xl border border-white/0 hover:border-white/5 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 mr-4 shadow-lg transition-transform group-hover:scale-105 ${
                group.id === 'g_ai_assistant' 
                  ? 'bg-gradient-to-br from-[#FFB020] to-[#FF4D6D] shadow-[#FFB020]/20' 
                  : 'bg-gradient-to-br from-[#6C5CFF] to-[#00D26A] shadow-[#6C5CFF]/20'
              }`}>
                {group.id === 'g_ai_assistant' ? <Sparkles className="w-5 h-5 text-white" /> : group.isPrivate ? <Users className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="font-bold text-sm text-white/95 group-hover:text-white truncate">{group.name}</h3>
                  <span className="text-[10px] font-mono text-white/40">{group.lastMessageTime}</span>
                </div>
                <p className="text-xs text-white/50 group-hover:text-white/70 truncate">{group.lastMessage}</p>
              </div>
            </div>
          ))}
          
          {/* Members Direct Messages (Mocked) */}
          <div className="pt-4 space-y-2">
            <h4 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-2 mb-1">Messages Privés</h4>
            {members.filter(m => m.id !== activeMemberId).map(member => (
              <div 
                key={member.id} 
                onClick={() => handleOpenDirectMessage(member)}
                className="flex items-center p-3 rounded-2xl border border-white/0 hover:border-white/5 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="relative mr-4 shrink-0">
                  <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00D26A] border-2 border-[#090D1A] rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-white/95 group-hover:text-white truncate">{member.name}</h3>
                  <p className="text-[11px] text-white/40 group-hover:text-white/60">Appuyez pour envoyer un message</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CHAT VIEW
  return (
    <div className="flex flex-col h-[75vh] bg-[#0A0D18] text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-10">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#112240]/90 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveGroupId(null)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden shrink-0 ${activeGroupId === 'g_ai_assistant' ? 'bg-gradient-to-br from-[#FFB020] to-[#FF4D6D]' : 'bg-gradient-to-br from-[#6C5CFF] to-[#00D26A]'}`}>
            {activeGroupId === 'g_ai_assistant' ? <Sparkles className="w-5 h-5 text-white" /> : activeGroup?.isPrivate && activeGroup.memberIds.length === 2 ? (
              <img src={members.find(m => m.id !== activeMemberId && activeGroup.memberIds.includes(m.id))?.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : activeGroup?.isPrivate ? <Users className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="text-base font-bold">{activeGroup?.name}</h2>
            <p className="text-[10px] text-white/50">{activeGroupId === 'g_ai_assistant' ? 'IA locale • Hors ligne' : `${activeGroup?.memberIds.length} membres`}</p>
          </div>
        </div>

      </div>

      {/* Pinned Message Banner */}
      {(() => {
        const pinnedMsg = activeMessages.find(m => m.id === activeGroup?.pinnedMessageId);
        if (!pinnedMsg) return null;
        return (
          <div 
            onClick={() => {
              const el = document.getElementById(`msg-${pinnedMsg.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex items-center justify-between px-4 py-2.5 bg-[#6C5CFF]/10 border-b border-[#6C5CFF]/20 cursor-pointer hover:bg-[#6C5CFF]/15 transition-colors"
          >
            <div className="flex items-center space-x-2 truncate min-w-0">
              <Pin className="w-3.5 h-3.5 text-[#FFB020] shrink-0" />
              <span className="text-[10px] font-extrabold text-[#FFB020] uppercase tracking-wider shrink-0">Épinglé</span>
              <span className="text-[11px] text-white/70 truncate italic">{pinnedMsg.content.substring(0, 60)}{pinnedMsg.content.length > 60 ? '...' : ''}</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleTogglePinMessage(pinnedMsg.id); }}
              className="p-1 hover:bg-white/10 rounded-full transition shrink-0 ml-2"
              title="Désépingler"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        );
      })()}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0A0D18] to-[#121829]">
        {activeMessages.map(msg => {
          const isMe = msg.senderId === activeUser?.id;
          const isAiMsg = msg.senderId === 'ai';
          const sender = members.find(m => m.id === msg.senderId);
          const isPinned = activeGroup?.pinnedMessageId === msg.id;
          
          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}>
              {!isMe && <span className="text-[10px] text-white/50 mb-1 ml-2">{isAiMsg ? '🤖 Assistant IA' : msg.senderName}</span>}
              <div className={`flex items-end space-x-2 max-w-[80%] ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {!isMe && !isAiMsg && sender && (
                  <img src={sender.photoUrl} alt={sender.name} className="w-6 h-6 rounded-full object-cover shrink-0 mb-1" />
                )}
                {isAiMsg && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFB020] to-[#FF4D6D] flex items-center justify-center shrink-0 mb-1">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                
                <div className={`p-3 rounded-2xl relative transition-all ${
                  isAiMsg 
                    ? 'bg-gradient-to-br from-[#FFB020]/10 to-[#FF4D6D]/10 text-white rounded-2xl rounded-tl-sm border border-[#FFB020]/35 shadow-lg shadow-[#FF4D6D]/5' 
                    : isMe 
                      ? 'bg-gradient-to-br from-[#00D26A] to-[#00B050] text-black font-medium rounded-2xl rounded-tr-sm shadow-lg shadow-[#00D26A]/10' 
                      : 'bg-white/5 border border-white/10 text-white rounded-2xl rounded-tl-sm backdrop-blur-sm shadow-sm'
                }`}>
                  {msg.type === 'text' && <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>}
                  {msg.type === 'image' && <img src={msg.content} alt="Media" className="rounded-xl max-h-48 object-cover shadow-md" />}
                  {msg.type === 'voice' && (
                    <VoiceMessagePlayer content={msg.content} isMe={isMe} />
                  )}
                  
                  <div className={`flex items-center justify-end space-x-1 mt-1.5 ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                    <span className="text-[9px] font-mono">{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-black/60" />}
                    {isPinned && <Pin className="w-3 h-3 text-[#FFB020]" />}
                  </div>
                </div>

                {/* Action buttons (reaction + pin) */}
                <div className="flex flex-col space-y-1 opacity-70 md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity shrink-0 mb-1">
                  <button
                    type="button"
                    onClick={() => setShowReactionsForId(showReactionsForId === msg.id ? null : msg.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition"
                    title="Réagir"
                  >
                    <Smile className="w-3.5 h-3.5 text-white/40" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePinMessage(msg.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition"
                    title={isPinned ? 'Désépingler' : 'Épingler'}
                  >
                    {isPinned ? <PinOff className="w-3.5 h-3.5 text-[#FFB020]" /> : <Pin className="w-3.5 h-3.5 text-white/40" />}
                  </button>
                </div>
              </div>

              {/* Reaction Picker Popup */}
              {showReactionsForId === msg.id && (
                <div className={`flex items-center space-x-1 mt-1 p-1.5 bg-[#1C2C4E] border border-white/10 rounded-full shadow-xl z-20 ${isMe ? 'self-end' : 'self-start ml-8'}`}>
                  {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="text-lg hover:scale-125 transition-transform p-0.5 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Display reactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className={`flex items-center space-x-0.5 mt-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 ${isMe ? 'self-end' : 'self-start ml-8'}`}>
                  {Object.entries(msg.reactions.reduce((acc: Record<string, string[]>, r) => {
                    acc[r.emoji] = acc[r.emoji] || [];
                    acc[r.emoji].push(r.senderName);
                    return acc;
                  }, {})).map(([emoji, names]) => (
                    <span key={emoji} title={(names as string[]).join(', ')} className="text-xs cursor-help flex items-center space-x-0.5">
                      <span>{emoji}</span>
                      {(names as string[]).length > 1 && <span className="text-[9px] text-white/50 font-bold">{(names as string[]).length}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {isRecording && (
          <div className="flex justify-end">
             <div className="p-3 rounded-2xl bg-[#00D26A]/50 text-black rounded-br-sm animate-pulse flex items-center space-x-2">
                <Mic className="w-4 h-4 animate-bounce" />
                <span className="text-sm font-bold">Enregistrement...</span>
             </div>
          </div>
        )}
        {isAiTyping && (
          <div className="flex items-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFB020] to-[#FF4D6D] flex items-center justify-center shrink-0 mr-2">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#1C2C4E] to-[#2A1F4E] text-white rounded-bl-sm border border-[#6C5CFF]/20">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 bg-[#FFB020] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-[#FFB020] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-[#FFB020] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                <span className="text-[10px] text-white/50 ml-2 font-medium">L'assistant rédige...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Drawing Canvas Overlay */}
      {showCanvas && (
        <div className="absolute inset-0 z-50 bg-[#0A0D18]/95 backdrop-blur-md flex flex-col rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-[#FF4D6D]" />
              <span className="text-sm font-bold text-white">Tableau de dessin</span>
            </div>
            <div className="flex items-center space-x-2">
              {['#FF4D6D', '#6C5CFF', '#00D26A', '#FFB020', '#4F8CFF', '#FFFFFF'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDrawColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${drawColor === c ? 'border-white scale-125' : 'border-white/20'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="flex-1 cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <div className="flex items-center space-x-2 p-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowCanvas(false)}
              className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold transition hover:bg-white/10 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <X className="w-4 h-4" />
              <span>Annuler</span>
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="px-4 py-2.5 rounded-xl bg-[#FFB020]/15 border border-[#FFB020]/20 text-[#FFB020] text-xs font-bold transition hover:bg-[#FFB020]/25 cursor-pointer"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={sendDrawing}
              className="flex-1 py-2.5 rounded-xl bg-[#00D26A] text-black text-xs font-extrabold transition hover:opacity-90 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white/5 border-t border-white/10 backdrop-blur-xl">
        {isRecording ? (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/25 p-2 rounded-full w-full px-4 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-xs font-bold text-red-400">Enregistrement vocal : {recordingDuration}s</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-full border border-white/10 focus-within:border-white/20 focus-within:bg-white/10 transition-all">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              capture="environment"
              onChange={handleMediaUpload}
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              type="button" 
              onClick={() => setShowCanvas(true)}
              className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
              title="Dessiner"
            >
              <Palette className="w-5 h-5" />
            </button>
            
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Votre message..." 
              className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0 placeholder-white/30"
            />
            
            {newMessage.trim() ? (
              <button 
                type="submit" 
                className="p-2.5 bg-[#00D26A] text-black rounded-full hover:scale-105 transition-transform"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={startVoiceRecording}
                className="p-2.5 bg-[#6C5CFF] text-white rounded-full hover:scale-105 transition-transform"
                title="Enregistrer un message vocal"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>


    </div>
  );
};
