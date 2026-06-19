import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Paperclip, CheckCheck, MessageCircle, Users, ArrowLeft, Search, Palette, X, Pin, PinOff, Smile, Play, Pause, Archive, Download, FileText, Reply, Trash2, MoreVertical, Plus, Info, UserPlus } from 'lucide-react';
import type { Member, ChatMessage, ChatGroup } from '../../types';
import { foyerService } from '../../services/foyerService';
import { getSupabaseClient } from '../../utils/supabase';
import { compressImageToBlob, extensionFromMimeType, uploadBlobToStorage } from '../../utils/imageCompressor';
import type { RealtimeChannel } from '@supabase/supabase-js';

const createLocalId = (prefix: string) => `${prefix}_${Date.now()}`;

const parseReplyText = (content: string): string => {
  try {
    return JSON.parse(content).text || content;
  } catch {
    return content;
  }
};

// Player de messages vocaux interactif et esthétique
const VoiceMessagePlayer: React.FC<{ content: string; isMe: boolean }> = ({ content, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
  initialGroupId
}) => {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [drawColor, setDrawColor] = useState('#FF4D6D');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReactionsForId, setShowReactionsForId] = useState<string | null>(null);
  const [activeReactionTooltip, setActiveReactionTooltip] = useState<{ msgId: string, emoji: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const [pinnedGroupIds, setPinnedGroupIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`pinned_groups_${activeMemberId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedGroupIds, setArchivedGroupIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`archived_groups_${activeMemberId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hiddenGroupIds, setHiddenGroupIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`mf_hidden_groups_${activeMemberId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`deleted_messages_${activeMemberId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'unread' | 'groups' | 'private'>('all');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<string[]>([]);

  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [typingMembers, setTypingMembers] = useState<{ [memberId: string]: string }>({});

  const lastTypingSentRef = useRef<number>(0);
  const activeTypingChannelRef = useRef<RealtimeChannel | null>(null);

  const togglePinGroup = (groupId: string) => {
    setPinnedGroupIds(prev => {
      const next = prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId];
      localStorage.setItem(`pinned_groups_${activeMemberId}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleArchiveGroup = (groupId: string) => {
    setArchivedGroupIds(prev => {
      const next = prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId];
      localStorage.setItem(`archived_groups_${activeMemberId}`, JSON.stringify(next));
      return next;
    });
  };

  // Realtime Typing Indicator setup
  useEffect(() => {
    const client = getSupabaseClient();
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!client || !foyerId || !activeGroupId) return;

    const channel = client.channel(`typing:${foyerId}:${activeGroupId}`);
    activeTypingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { memberId, name, isTyping } = payload;
        if (memberId !== activeMemberId) {
          setTypingMembers(prev => {
            const next = { ...prev };
            if (isTyping) {
              next[memberId] = name;
            } else {
              delete next[memberId];
            }
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      activeTypingChannelRef.current = null;
    };
  }, [activeGroupId, activeMemberId]);

  const activeUser = members.find(m => m.id === activeMemberId);

  const uploadVoiceBlob = useCallback(async (blob: Blob, groupId: string, senderId: string): Promise<string | null> => {
    const client = getSupabaseClient();
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!client || !foyerId) return null;

    try {
      const mime = blob.type || 'audio/webm';
      const extension = mime.includes('mp4') ? 'm4a'
        : mime.includes('aac') ? 'aac'
        : mime.includes('ogg') ? 'ogg'
        : mime.includes('wav') ? 'wav'
        : 'webm';
      const filePath = `${foyerId}/${groupId}/${senderId}_${Date.now()}.${extension}`;
      const { error } = await client.storage
        .from('chat-media')
        .upload(filePath, blob, { contentType: mime, upsert: false });

      if (error) {
        console.warn('[Messagerie] Voice upload fallback to local payload:', error.message);
        return null;
      }

      const { data } = client.storage.from('chat-media').getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (err) {
      console.warn('[Messagerie] Voice upload failed, using fallback payload:', err);
      return null;
    }
  }, []);

  const saveMessageToCloud = useCallback(async (msg: ChatMessage) => {
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!foyerId) return;
    try {
      const client = getSupabaseClient();
      const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
      await foyerService.upsertItem('chat_messages', foyerId, {
        id: msg.id,
        group_id: msg.groupId,
        sender_id: msg.senderId,
        sender_user_id: msg.senderUserId || user?.id || null,
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

  // Initialization of groups is handled by App.tsx. Stay on the conversation
  // list by default, except when a notification explicitly targets a group.
  useEffect(() => {
    if (initialGroupId && initialGroupId !== prevInitialGroupId.current) {
      setActiveGroupId(initialGroupId);
      prevInitialGroupId.current = initialGroupId;
    }
  }, [initialGroupId]);

  useEffect(() => {
    const isVisibleGroup = (g: ChatGroup) => {
      if (g.id === 'g_ai_assistant' || g.id.startsWith('g_ai')) return false;
      if (hiddenGroupIds.includes(g.id)) return false;
      if (!g.isPrivate) return true;
      return g.memberIds.includes(activeMemberId);
    };

    if (activeGroupId && !groups.some(g => g.id === activeGroupId && isVisibleGroup(g))) {
      queueMicrotask(() => setActiveGroupId(null));
    }
  }, [activeGroupId, activeMemberId, groups, hiddenGroupIds]);



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

  useEffect(() => {
    if (!activeGroupId) return;
    queueMicrotask(() => {
      setShowGroupMenu(false);
      setShowConversationInfo(false);
      setShowMsgSearch(false);
      setMessageSearchQuery('');
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [activeGroupId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroupId || !activeUser) return;

    const userText = newMessage.trim();
    let contentValue = userText;
    if (replyingToMessage) {
      contentValue = JSON.stringify({
        replyToId: replyingToMessage.id,
        text: userText
      });
    }

    const newMsg: ChatMessage = {
      id: createLocalId('msg'),
      groupId: activeGroupId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      type: 'text',
      content: contentValue,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      readBy: [activeUser.id]
    };

    setMessages(prev => [...prev, newMsg]);
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: userText, lastMessageTime: newMsg.timestamp } : g));
    setNewMessage('');
    setReplyingToMessage(null);

    saveMessageToCloud(newMsg);
    const activeGroup = groups.find(g => g.id === activeGroupId);
    if (activeGroup) {
      saveGroupToCloud({
        ...activeGroup,
        lastMessage: userText,
        lastMessageTime: newMsg.timestamp
      });
    }

    // Clear typing indicator
    const channel = activeTypingChannelRef.current;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { memberId: activeMemberId, name: activeUser.name, isTyping: false }
      });
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId || !activeUser) return;
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!foyerId) {
      alert("Connectez le foyer au cloud avant d'envoyer un fichier.");
      return;
    }

    if (!file.type.startsWith('image/')) {
      try {
        const msgId = createLocalId('msg');
        const ext = extensionFromMimeType(file.type, file.name.split('.').pop() || 'bin');
        const url = await uploadBlobToStorage('chat-media', `${foyerId}/${activeGroupId}/${msgId}.${ext}`, file);
        const contentValue = `${url}|${file.name}`;
        const newMsg: ChatMessage = {
          id: msgId,
          groupId: activeGroupId,
          senderId: activeUser.id,
          senderName: activeUser.name,
          type: 'document',
          content: contentValue,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          readBy: [activeUser.id]
        };
        setMessages(prev => [...prev, newMsg]);
        setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: `📄 ${file.name}`, lastMessageTime: newMsg.timestamp } : g));
        saveMessageToCloud(newMsg);

        const activeGroup = groups.find(g => g.id === activeGroupId);
        if (activeGroup) {
          saveGroupToCloud({
            ...activeGroup,
            lastMessage: `📄 ${file.name}`,
            lastMessageTime: newMsg.timestamp
          });
        }
      } catch (err) {
        console.error("Failed to upload chat document:", err);
        alert("Impossible d'envoyer ce document. Réessayez dans un instant.");
      };
      return;
    }

    try {
      const { blob, ext } = await compressImageToBlob(file, 'classic');
      const msgId = createLocalId('msg');
      const uploadedUrl = await uploadBlobToStorage('chat-media', `${foyerId}/${activeGroupId}/${msgId}.${ext}`, blob);
      if (uploadedUrl) {
        const newMsg: ChatMessage = {
          id: msgId,
          groupId: activeGroupId,
          senderId: activeUser.id,
          senderName: activeUser.name,
          type: 'image',
          content: uploadedUrl,
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
    } catch (err) {
      console.error("Failed to compress and upload image in chat:", err);
      alert("Impossible d'envoyer cette image. Réessayez dans un instant.");
    }
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
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());

        if (!activeGroupId || !activeUser) return;

        try {
          const uploadedUrl = await uploadVoiceBlob(audioBlob, activeGroupId, activeUser.id);
          if (!uploadedUrl) {
            alert("Impossible d'envoyer ce message vocal. Réessayez dans un instant.");
            return;
          }
          const audioPayload = uploadedUrl;
          const payload = `${recordingDuration}|${audioPayload}`;

          const newMsg: ChatMessage = {
            id: createLocalId('msg'),
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
        } catch (err) {
          console.error('[Messagerie] Unable to prepare voice message:', err);
          alert("Impossible d'envoyer ce message vocal. Réessayez dans un instant.");
        }
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

  const sendDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeGroupId || !activeUser) return;
    const foyerId = localStorage.getItem('mf_cloud_foyer_id');
    if (!foyerId) {
      alert("Connectez le foyer au cloud avant d'envoyer un dessin.");
      return;
    }
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
    if (!blob) return;
    const msgId = createLocalId('msg');
    const imageUrl = await uploadBlobToStorage('chat-media', `${foyerId}/${activeGroupId}/${msgId}.png`, blob);
    const newMsg: ChatMessage = {
      id: msgId,
      groupId: activeGroupId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      type: 'image',
      content: imageUrl,
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
    const sortedIds = [activeMemberId, targetMember.id].sort();
    const newGroupId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    const existingGroup = groups.find(g => g.id === newGroupId);

    if (existingGroup) {
      setActiveGroupId(existingGroup.id);
    } else {
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

  const handleCreateGroup = () => {
    const title = newGroupName.trim();
    if (!title) {
      alert("Donnez un nom au groupe de discussion.");
      return;
    }

    const memberIds = Array.from(new Set([activeMemberId, ...newGroupMemberIds]));
    if (memberIds.length < 2) {
      alert("Ajoutez au moins un autre membre au groupe.");
      return;
    }

    const newGroup: ChatGroup = {
      id: createLocalId('grp'),
      name: title,
      isPrivate: false,
      memberIds,
      lastMessage: 'Groupe créé',
      lastMessageTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setGroups(prev => [newGroup, ...prev]);
    saveGroupToCloud(newGroup);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
    setNewGroupMemberIds([]);
    setShowCreateGroup(false);
  };

  const handleClearConversationMessages = async () => {
    if (!activeGroupId || !activeGroup) return;
    const count = activeMessages.length;
    if (count === 0) {
      alert("Cette discussion est déjà vide.");
      return;
    }
    if (!window.confirm(`Vider les ${count} message${count > 1 ? 's' : ''} de cette discussion sans supprimer la conversation ?`)) return;

    setShowGroupMenu(false);
    setMessages(prev => prev.filter(m => m.groupId !== activeGroupId));

    const updatedGroup: ChatGroup = {
      ...activeGroup,
      lastMessage: '',
      lastMessageTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setGroups(prev => prev.map(g => g.id === activeGroup.id ? updatedGroup : g));
    saveGroupToCloud(updatedGroup);

    const client = getSupabaseClient();
    if (client) {
      await client.from('chat_messages').delete().eq('group_id', activeGroupId);
    }
  };

  const handleDeleteForMe = (msgId: string) => {
    setDeletedMessageIds(prev => {
      const next = [...prev, msgId];
      localStorage.setItem(`deleted_messages_${activeMemberId}`, JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteForAll = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const client = getSupabaseClient();
    if (client) {
      const foyerId = localStorage.getItem('mf_cloud_foyer_id');
      if (foyerId) {
        await client.from('chat_messages').delete().eq('id', msgId);
      }
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeMessages = messages.filter(m => m.groupId === activeGroupId && !deletedMessageIds.includes(m.id));
  const filteredActiveMessages = activeMessages.filter(msg => {
    if (!messageSearchQuery) return true;
    let text = msg.content;
    if (msg.content.startsWith('{"replyToId":')) {
      text = parseReplyText(msg.content);
    }
    return text.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  const visibleGroups = groups.filter(g => {
    if (g.id === 'g_ai_assistant' || g.id.startsWith('g_ai')) return false;
    if (hiddenGroupIds.includes(g.id)) return false;
    if (!g.isPrivate) return true;
    return g.memberIds.includes(activeMemberId);
  });

  const getGroupMessages = (groupId: string) => {
    return messages.filter(m => m.groupId === groupId && !deletedMessageIds.includes(m.id));
  };

  const getLatestGroupMessage = (groupId: string) => {
    const groupMessages = getGroupMessages(groupId);
    return groupMessages[groupMessages.length - 1] || null;
  };

  const getMessagePreview = (msg?: ChatMessage | null, fallback?: string) => {
    if (!msg) return fallback || 'Aucun message pour le moment';
    if (msg.type === 'image') return 'Photo partagée';
    if (msg.type === 'voice') return 'Message vocal';
    if (msg.type === 'document') return msg.content.startsWith('data:') ? 'Document partagé' : msg.content;

    let text = msg.content || '';
    if (text.startsWith('{"replyToId":')) {
      text = parseReplyText(text);
    }

    return text.trim() || fallback || 'Message';
  };

  const getConversationMeta = (group: ChatGroup) => {
    const participants = members.filter(m => group.memberIds.includes(m.id));
    const otherParticipants = participants.filter(m => m.id !== activeMemberId);
    const latestMessage = getLatestGroupMessage(group.id);
    const unreadCount = getGroupMessages(group.id).filter(m => m.senderId !== activeMemberId && !m.readBy.includes(activeMemberId)).length;

    let title: string;
    let subtitle: string;
    let icon = 'group' as 'private' | 'group';

    if (group.isPrivate) {
      icon = 'private';
      title = otherParticipants.length > 0
        ? otherParticipants.map(m => m.name).join(', ')
        : group.name || 'Conversation privée';
      subtitle = otherParticipants.length === 1
        ? `Privé avec ${otherParticipants[0].name}`
        : `Conversation privée • ${participants.length} membres`;
    } else {
      title = group.name || 'Discussion de famille';
      const memberNames = participants.map(m => m.name).filter(Boolean);
      const expectedCount = Math.max(group.memberIds.length || participants.length, participants.length);
      subtitle = memberNames.length > 0
        ? `${expectedCount} membres : ${memberNames.join(', ')}`
        : `${expectedCount} membres`;
    }

    const preview = latestMessage
      ? `${latestMessage.senderId === activeMemberId ? 'Vous' : latestMessage.senderName} : ${getMessagePreview(latestMessage)}`
      : (group.lastMessage && group.lastMessage !== 'Nouvelle conversation' ? group.lastMessage : subtitle);

    return {
      title,
      subtitle,
      participants,
      preview,
      time: latestMessage?.timestamp || group.lastMessageTime || '',
      unreadCount,
      icon,
      otherAvatar: group.isPrivate && otherParticipants.length === 1 ? otherParticipants[0].photoUrl : undefined
    };
  };

  // LIST VIEW
  if (!activeGroupId) {
    // Filter by search query
    const filteredGroups = visibleGroups.filter(g => {
      const meta = getConversationMeta(g);
      const haystack = `${meta.title} ${meta.subtitle} ${meta.preview}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const matchesFilter =
        conversationFilter === 'all' ||
        (conversationFilter === 'unread' && meta.unreadCount > 0) ||
        (conversationFilter === 'groups' && !g.isPrivate) ||
        (conversationFilter === 'private' && g.isPrivate);
      return matchesSearch && matchesFilter;
    });
    const memberIdsWithExistingDirectGroup = new Set(
      visibleGroups
        .filter(g => g.isPrivate && g.memberIds.length === 2 && g.memberIds.includes(activeMemberId))
        .flatMap(g => g.memberIds.filter(id => id !== activeMemberId))
    );
    const filteredMembers = members.filter(m =>
      m.id !== activeMemberId &&
      !memberIdsWithExistingDirectGroup.has(m.id) &&
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort groups: pinned first, then active conversations first.
    const sortedGroups = [...filteredGroups].sort((a, b) => {
      const aPinned = pinnedGroupIds.includes(a.id);
      const bPinned = pinnedGroupIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const aHasMessages = getGroupMessages(a.id).length > 0;
      const bHasMessages = getGroupMessages(b.id).length > 0;
      if (aHasMessages && !bHasMessages) return -1;
      if (!aHasMessages && bHasMessages) return 1;
      return (getConversationMeta(b).time || '').localeCompare(getConversationMeta(a).time || '');
    });

    const unarchivedGroups = sortedGroups.filter(g => !archivedGroupIds.includes(g.id));
    const archivedGroups = sortedGroups.filter(g => archivedGroupIds.includes(g.id));

    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#090D1A] to-[#04060C] text-white">
        {/* Header */}
        <div className="flex flex-col border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 rounded-2xl border border-[#00D26A]/30 shadow-lg shadow-[#00D26A]/5">
                <MessageCircle className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Messages</h2>
                <p className="text-[10px] font-medium text-white/40">Connecté : {activeUser?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-95 border border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A] hover:bg-[#00D26A]/15 text-[10px] font-black uppercase tracking-wide"
                title="Créer un groupe"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau groupe</span>
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="sm:hidden p-2 rounded-full transition-all active:scale-95 border border-[#00D26A]/25 bg-[#00D26A]/10 text-[#00D26A] hover:bg-[#00D26A]/15"
                title="Créer un groupe"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-full transition-all active:scale-95 border border-white/5 ${showSearch ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                title="Rechercher"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showSearch && (
            <div className="px-4 pb-3 flex items-center space-x-2 animate-fade-in">
              <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-white/20">
                <Search className="w-3.5 h-3.5 text-white/30 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une discussion..."
                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none focus:ring-0 placeholder-white/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-white/10 rounded-full text-white/40">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {showCreateGroup && (
            <div className="create-group-box mx-4 mb-4 rounded-3xl border border-white/10 bg-[#0F1626]/95 p-4 space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white">Créer un groupe</h3>
                  <p className="text-[10px] text-white/45 mt-0.5">Choisissez un nom et les membres de la discussion.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                    setNewGroupMemberIds([]);
                  }}
                  className="p-1.5 rounded-full text-white/45 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nom du groupe, ex: Parents école"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]/50"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {members.filter(m => m.id !== activeMemberId).map(member => {
                  const selected = newGroupMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setNewGroupMemberIds(prev => selected ? prev.filter(id => id !== member.id) : [...prev, member.id])}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border text-left transition ${
                        selected
                          ? 'bg-[#00D26A]/12 border-[#00D26A]/35 text-white'
                          : 'bg-white/5 border-white/8 text-white/65 hover:bg-white/8'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{member.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{member.name}</p>
                        <p className="text-[9px] text-white/35 truncate">{member.role || 'Membre'}</p>
                      </div>
                      <span className={`ml-auto w-4 h-4 rounded-full border ${selected ? 'bg-[#00D26A] border-[#00D26A]' : 'border-white/20'}`} />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleCreateGroup}
                className="w-full py-3 rounded-2xl bg-[#00D26A] text-[#06110B] text-xs font-black uppercase tracking-wide hover:brightness-105 active:scale-[0.99]"
              >
                Créer le groupe
              </button>
            </div>
          )}

          <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'unread', label: 'Non lus' },
              { id: 'groups', label: 'Groupes' },
              { id: 'private', label: 'Privés' }
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setConversationFilter(filter.id as typeof conversationFilter)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shrink-0 transition ${
                  conversationFilter === filter.id
                    ? 'bg-[#00D26A]/15 border-[#00D26A]/25 text-[#00D26A]'
                    : 'bg-white/5 border-white/8 text-white/40'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {!showCreateGroup && (
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="w-full mb-3 flex items-center gap-3 rounded-[24px] border border-[#00D26A]/20 bg-[#00D26A]/10 p-4 text-left hover:bg-[#00D26A]/15 transition"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#00D26A]/15 border border-[#00D26A]/25 flex items-center justify-center text-[#00D26A] shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Créer un groupe de discussion</p>
                <p className="text-[10px] text-white/45 truncate">Choisissez les membres, donnez un nom, puis retrouvez le groupe dans la liste.</p>
              </div>
            </button>
          )}

          {unarchivedGroups.length > 0 && (
            <>
              <h4 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-2 mb-1">Discussions</h4>
              {unarchivedGroups.map(group => {
                const isPinned = pinnedGroupIds.includes(group.id);
                const meta = getConversationMeta(group);
                return (
                  <div
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className="flex items-center p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5 cursor-pointer transition-all active:scale-[0.98] group relative"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 mr-4 shadow-lg transition-transform group-hover:scale-105 bg-gradient-to-br from-[#6C5CFF] to-[#00D26A] shadow-[#6C5CFF]/20">
                      {meta.otherAvatar ? (
                        <img src={meta.otherAvatar} alt={meta.title} className="w-full h-full rounded-full object-cover" />
                      ) : meta.icon === 'private' ? (
                        <Users className="w-5 h-5 text-white" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <h3 className="font-bold text-sm text-white/95 group-hover:text-white truncate">{meta.title}</h3>
                          {isPinned && <Pin className="w-3 h-3 text-[#FFB020] fill-[#FFB020] shrink-0" />}
                        </div>
                        <span className="text-[10px] font-mono text-white/40 shrink-0 ml-2">{meta.time}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                          meta.icon === 'private'
                            ? 'text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/15'
                            : 'text-[#6C5CFF] bg-[#6C5CFF]/10 border-[#6C5CFF]/15'
                        }`}>
                          {meta.icon === 'private' ? 'Privé' : 'Groupe'}
                        </span>
                        <span className="text-[10px] text-white/35 truncate">{meta.subtitle}</span>
                      </div>
                      <p className={`text-xs truncate ${meta.unreadCount > 0 ? 'text-white font-bold' : 'text-white/50 group-hover:text-white/70'}`}>{meta.preview}</p>
                    </div>
                    {meta.unreadCount > 0 && (
                      <div className="ml-3 min-w-5 h-5 px-1.5 rounded-full bg-[#FF4D6D] text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-[#FF4D6D]/20">
                        {meta.unreadCount > 9 ? '9+' : meta.unreadCount}
                      </div>
                    )}

                    {/* Pin/Archive actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity bg-[#090D1A] pl-2 rounded-l-full py-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePinGroup(group.id); }}
                        className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-[#FFB020] transition-colors"
                        title={isPinned ? "Désépingler" : "Épingler"}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-[#FFB020] text-[#FFB020]' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Archiver cette conversation ?')) toggleArchiveGroup(group.id); }}
                        className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-[#6C5CFF] transition-colors"
                        title="Archiver"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {unarchivedGroups.length === 0 && filteredMembers.length === 0 && (
            <div className="p-6 rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] text-center space-y-2">
              <MessageCircle className="w-8 h-8 text-white/25 mx-auto" />
              <h4 className="text-sm font-extrabold text-white">Aucune conversation visible</h4>
              <p className="text-xs text-white/45 leading-relaxed">
                Changez le filtre ou sélectionnez un membre pour démarrer une conversation privée.
              </p>
            </div>
          )}

          {/* Members Direct Messages (Mocked) */}
          {filteredMembers.length > 0 && (
            <div className="pt-4 space-y-2">
              <h4 className="text-[10px] font-black text-white/35 uppercase tracking-widest pl-2 mb-1">Messages Privés</h4>
              {filteredMembers.map(member => (
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
          )}

          {/* Archived groups list toggle */}
          {archivedGroups.length > 0 && (
            <div className="pt-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white/70 transition-colors flex items-center justify-center space-x-2"
              >
                <Archive className="w-4 h-4 text-white/50" />
                <span>{showArchived ? "Masquer les archives" : `Voir les archives (${archivedGroups.length})`}</span>
              </button>

              {showArchived && (
                <div className="mt-2 space-y-2 p-2 bg-white/5 rounded-2xl border border-white/5 animate-fade-in">
                  {archivedGroups.map(group => {
                    const meta = getConversationMeta(group);
                    return (
                      <div
                        key={group.id}
                        onClick={() => setActiveGroupId(group.id)}
                        className="flex items-center p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group relative"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0 mr-3 overflow-hidden">
                          {meta.otherAvatar ? (
                            <img src={meta.otherAvatar} alt={meta.title} className="w-full h-full object-cover" />
                          ) : meta.icon === 'private' ? (
                            <Users className="w-4 h-4 text-white/75" />
                          ) : (
                            <MessageCircle className="w-4 h-4 text-white/75" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs text-white/90 truncate">{meta.title}</h3>
                          <p className="text-[11px] text-white/40 truncate">{meta.preview}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleArchiveGroup(group.id); }}
                          className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity bg-[#090D1A]"
                          title="Désarchiver"
                        >
                          <Archive className="w-3.5 h-3.5 text-[#00D26A]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // CHAT VIEW
  const activeGroupMeta = activeGroup ? getConversationMeta(activeGroup) : null;
  const activeParticipantNames = activeGroupMeta?.participants.map(m => m.name).filter(Boolean) || [];
  return (
    <div className="fixed inset-x-0 top-0 bottom-0 z-[80] flex min-h-0 flex-col overflow-hidden bg-[#0A0D18] pt-[env(safe-area-inset-top,0px)] text-white shadow-2xl md:relative md:inset-auto md:z-10 md:h-[calc(100dvh-9rem)] md:rounded-3xl md:border md:border-white/10 md:pt-0">
      {/* Chat Header */}
      <div className="relative z-[120] flex shrink-0 items-center justify-between p-3 border-b border-white/10 bg-[#112240]/90 backdrop-blur-md">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => { setActiveGroupId(null); setReplyingToMessage(null); }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#6C5CFF] to-[#00D26A]">
            {activeGroupMeta?.otherAvatar ? (
              <img src={activeGroupMeta.otherAvatar} alt={activeGroupMeta.title} className="w-full h-full object-cover" />
            ) : activeGroupMeta?.icon === 'private' ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              <MessageCircle className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{activeGroupMeta?.title || activeGroup?.name}</h2>
            <p className="text-[10px] text-white/50 truncate">
              {activeGroup?.isPrivate
                ? activeGroupMeta?.subtitle || `${activeGroup?.memberIds.length || 0} membres`
                : `${activeParticipantNames.length || activeGroup?.memberIds.length || 0} membres • ${activeParticipantNames.slice(0, 3).join(', ')}${activeParticipantNames.length > 3 ? '…' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowConversationInfo(prev => !prev)}
            className={`p-2 hover:bg-white/10 rounded-full transition-colors ${showConversationInfo ? 'text-[#00D26A]' : 'text-white/60'}`}
            title="Informations de discussion"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowMsgSearch(!showMsgSearch); if (showMsgSearch) setMessageSearchQuery(''); }}
            className={`p-2 hover:bg-white/10 rounded-full transition-colors ${showMsgSearch ? 'text-[#00D26A]' : 'text-white/60'}`}
            title="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              className={`p-2 hover:bg-white/10 rounded-full transition-colors ${showGroupMenu ? 'text-white' : 'text-white/60'}`}
              title="Options de discussion"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showGroupMenu && (
              <>
              <button
                type="button"
                aria-label="Fermer les options"
                className="fixed inset-0 z-[129] cursor-default bg-transparent"
                onClick={() => setShowGroupMenu(false)}
              />
              <div className="conversation-options-dropdown absolute right-0 mt-2 w-72 bg-[#0F1626]/98 border border-white/15 rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] p-2 z-[130] text-xs text-left animate-fade-in backdrop-blur-xl">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Options de discussion</p>
                  <p className="text-[10px] text-white/45 mt-0.5 truncate">{activeGroupMeta?.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupMenu(false);
                    if (window.confirm("Masquer cette discussion de votre liste ?")) {
                      const next = [...hiddenGroupIds, activeGroupId!];
                      setHiddenGroupIds(next);
                      localStorage.setItem(`mf_hidden_groups_${activeMemberId}`, JSON.stringify(next));
                      setActiveGroupId(null);
                    }
                  }}
                  className="w-full text-left px-3 py-3 rounded-2xl hover:bg-white/5 text-white/80 transition cursor-pointer"
                >
                  <span className="block font-bold">Masquer pour moi</span>
                  <span className="block text-[10px] text-white/40 mt-0.5">Retire la discussion de votre liste uniquement.</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowGroupMenu(false);
                    const isArchived = archivedGroupIds.includes(activeGroupId!);
                    const next = isArchived
                      ? archivedGroupIds.filter(id => id !== activeGroupId)
                      : [...archivedGroupIds, activeGroupId!];
                    setArchivedGroupIds(next);
                    localStorage.setItem(`archived_groups_${activeMemberId}`, JSON.stringify(next));
                    alert(isArchived ? "Discussion désarchivée." : "Discussion archivée.");
                    setActiveGroupId(null);
                  }}
                  className="w-full text-left px-3 py-3 rounded-2xl hover:bg-white/5 text-white/80 transition cursor-pointer"
                >
                  <span className="block font-bold">{archivedGroupIds.includes(activeGroupId!) ? 'Désarchiver' : 'Archiver la discussion'}</span>
                  <span className="block text-[10px] text-white/40 mt-0.5">Range la conversation sans supprimer les messages.</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearConversationMessages}
                  className="w-full text-left px-3 py-3 rounded-2xl hover:bg-white/5 text-white/80 transition cursor-pointer"
                >
                  <span className="block font-bold">Vider les messages</span>
                  <span className="block text-[10px] text-white/40 mt-0.5">Supprime le contenu, mais garde la conversation.</span>
                </button>

                {activeGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupMenu(false);
                      if (window.confirm("Quitter ce groupe de discussion ?")) {
                        const updated = {
                          ...activeGroup,
                          memberIds: activeGroup.memberIds.filter(id => id !== activeMemberId)
                        };
                        setGroups(prev => prev.map(g => g.id === activeGroup.id ? updated : g));
                        saveGroupToCloud(updated);
                        setActiveGroupId(null);
                      }
                    }}
                    className="w-full text-left px-3 py-3 rounded-2xl hover:bg-white/5 text-amber-400 transition cursor-pointer"
                  >
                    <span className="block font-bold">Quitter le groupe</span>
                    <span className="block text-[10px] text-amber-300/60 mt-0.5">Vous ne verrez plus cette conversation.</span>
                  </button>
                )}

                {activeGroup && (() => {
                  const activeMemberRole = members.find(m => m.id === activeMemberId)?.role;
                  const canDelete = activeMemberRole && ['Chef de famille', 'Gestionnaire', 'admin', 'parent', 'Parent'].includes(activeMemberRole);
                  if (!canDelete) return null;
                  // Protect the default family group (first non-private, non-AI group)
                  const isSystemGroup = groups.findIndex(g => !g.isPrivate) === groups.indexOf(activeGroup) && activeGroup.id === groups.find(g => !g.isPrivate)?.id;
                  if (isSystemGroup) return null;
                  return (
                    <button
                      type="button"
                      onClick={async () => {
                        setShowGroupMenu(false);
                        if (window.confirm("Supprimer COMPLÈTEMENT ce groupe et tous ses messages pour TOUTE la famille ? Cette action est irréversible.")) {
                          const client = getSupabaseClient();
                          const foyerId = localStorage.getItem('mf_cloud_foyer_id');
                          if (client && foyerId) {
                            try {
                              await client.from('chat_groups').delete().eq('id', activeGroup.id);
                              await client.from('chat_messages').delete().eq('group_id', activeGroup.id);
                            } catch (err) {
                              console.error("Error deleting group from Supabase:", err);
                            }
                          }
                          setGroups(prev => prev.filter(g => g.id !== activeGroup.id));
                          setActiveGroupId(null);
                        }
                      }}
                      className="w-full text-left px-3 py-3 rounded-2xl hover:bg-red-500/10 text-red-400 font-bold border-t border-white/5 transition cursor-pointer"
                    >
                      <span className="block font-bold">Supprimer le groupe</span>
                      <span className="block text-[10px] text-red-300/60 mt-0.5">Supprime le groupe pour toute la famille.</span>
                    </button>
                  );
                })()}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showConversationInfo && activeGroupMeta && (
        <div className="relative z-[110] shrink-0 border-b border-white/10 bg-[#0F1626]/95 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white">{activeGroupMeta.title}</h3>
              <p className="text-[10px] text-white/45 mt-0.5">{activeGroup?.isPrivate ? 'Conversation privée' : 'Groupe de discussion'} • {activeGroupMeta.participants.length} membre(s)</p>
            </div>
            <button type="button" onClick={() => setShowConversationInfo(false)} className="p-1.5 rounded-full bg-white/5 text-white/45 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {activeGroupMeta.participants.map(member => (
              <div key={member.id} className="shrink-0 min-w-[120px] rounded-2xl border border-white/8 bg-white/[0.04] p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/60">{member.name.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{member.name}</p>
                  <p className="text-[9px] text-white/35 truncate">{member.role || 'Membre'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Search Bar */}
      {showMsgSearch && (
        <div className="flex shrink-0 items-center space-x-2 border-b border-white/10 bg-[#112240]/80 p-2 animate-fade-in">
          <Search className="w-4 h-4 text-white/40 ml-1 shrink-0" />
          <input
            type="text"
            value={messageSearchQuery}
            onChange={(e) => setMessageSearchQuery(e.target.value)}
            placeholder="Rechercher un message..."
            className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none focus:ring-0 placeholder-white/30"
          />
          {messageSearchQuery && (
            <button onClick={() => setMessageSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full text-white/40">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Message Banner */}
      {(() => {
        const pinnedMsg = activeMessages.find(m => m.id === activeGroup?.pinnedMessageId);
        if (!pinnedMsg) return null;

        let displayPinnedContent = pinnedMsg.content;
        if (pinnedMsg.content.startsWith('{"replyToId":')) {
          displayPinnedContent = parseReplyText(pinnedMsg.content);
        }

        return (
          <div
            onClick={() => {
              const el = document.getElementById(`msg-${pinnedMsg.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex shrink-0 items-center justify-between px-4 py-2.5 bg-[#6C5CFF]/10 border-b border-[#6C5CFF]/20 cursor-pointer hover:bg-[#6C5CFF]/15 transition-colors"
          >
            <div className="flex items-center space-x-2 truncate min-w-0">
              <Pin className="w-3.5 h-3.5 text-[#FFB020] shrink-0" />
              <span className="text-[10px] font-extrabold text-[#FFB020] uppercase tracking-wider shrink-0">Épinglé</span>
              <span className="text-[11px] text-white/70 truncate italic">{displayPinnedContent.substring(0, 60)}{displayPinnedContent.length > 60 ? '...' : ''}</span>
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
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0A0D18] to-[#121829]">
        {filteredActiveMessages.map(msg => {
          const isMe = msg.senderId === activeUser?.id;
          const sender = members.find(m => m.id === msg.senderId);
          const isPinned = activeGroup?.pinnedMessageId === msg.id;

          // Parse reply context
          let replyToId: string | undefined = undefined;
          let actualContent = msg.content;
          if (msg.content.startsWith('{"replyToId":')) {
            try {
              const parsed = JSON.parse(msg.content);
              replyToId = parsed.replyToId;
              actualContent = parsed.text;
            } catch {
              // Keep the raw message content when reply metadata is malformed.
            }
          }

          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}>
              {!isMe && <span className="text-[10px] text-white/50 mb-1 ml-2">{msg.senderName}</span>}
              <div className={`flex items-end space-x-2 max-w-[80%] ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {!isMe && sender && (
                  <img src={sender.photoUrl} alt={sender.name} className="w-6 h-6 rounded-full object-cover shrink-0 mb-1" />
                )}

                <div className={`p-3 rounded-2xl relative transition-all ${
                  isMe
                      ? 'bg-gradient-to-br from-[#00D26A] to-[#00B050] text-black font-medium rounded-2xl rounded-tr-sm shadow-lg shadow-[#00D26A]/10'
                      : 'bg-white/5 border border-white/10 text-white rounded-2xl rounded-tl-sm backdrop-blur-sm shadow-sm'
                }`}>
                  {/* Replied message preview box */}
                  {replyToId && (() => {
                    const repliedMsg = messages.find(m => m.id === replyToId);
                    if (!repliedMsg) return null;

                    let repliedCleanContent = repliedMsg.content;
                    if (repliedMsg.content.startsWith('{"replyToId":')) {
                      repliedCleanContent = parseReplyText(repliedMsg.content);
                    }
                    return (
                      <div className="bg-black/20 border-l-4 border-[#6C5CFF] p-1.5 rounded-md mb-2 text-xs opacity-75 max-w-full truncate">
                        <span className="font-extrabold text-[9px] text-[#6C5CFF] block mb-0.5">{repliedMsg.senderName}</span>
                        <span className="text-[10px] text-white/70 italic truncate block">
                          {repliedMsg.type === 'text' ? repliedCleanContent : repliedMsg.type === 'image' ? '📷 Image' : repliedMsg.type === 'voice' ? '🎤 Audio' : '📄 Document'}
                        </span>
                      </div>
                    );
                  })()}

                  {msg.type === 'text' && <p className="text-sm whitespace-pre-line leading-relaxed">{actualContent}</p>}
                  {msg.type === 'image' && <img src={msg.content} alt="Media" className="rounded-xl max-h-48 object-cover shadow-md" />}
                  {msg.type === 'voice' && (
                    <VoiceMessagePlayer content={msg.content} isMe={isMe} />
                  )}
                  {msg.type === 'document' && (() => {
                    const parts = actualContent.split('|');
                    const filename = parts[parts.length - 1] || 'Document';
                    const dataUrl = parts.slice(0, -1).join('|');
                    return (
                      <div className="flex items-center space-x-3 p-2 bg-black/10 rounded-xl border border-white/10 max-w-xs">
                        <FileText className="w-8 h-8 text-[#00D26A]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-white">{filename}</p>
                          <a
                            href={dataUrl}
                            download={filename}
                            className="text-[10px] text-[#00D26A] hover:underline flex items-center space-x-1 mt-0.5"
                          >
                            <Download className="w-3 h-3 mr-0.5" />
                            <span>Télécharger</span>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  <div className={`flex items-center justify-end space-x-1 mt-1.5 ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                    <span className="text-[9px] font-mono">{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-black/60" />}
                    {isPinned && <Pin className="w-3 h-3 text-[#FFB020]" />}
                  </div>
                </div>

                {/* Action buttons (reply + reaction + pin + delete) */}
                <div className="flex flex-col space-y-1 opacity-70 md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity shrink-0 mb-1">
                  <button
                    type="button"
                    onClick={() => setReplyingToMessage(msg)}
                    className="p-1 hover:bg-white/10 rounded-full transition text-white/40 hover:text-white"
                    title="Répondre"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReactionsForId(showReactionsForId === msg.id ? null : msg.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition text-white/40 hover:text-white"
                    title="Réagir"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePinMessage(msg.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition text-white/40 hover:text-white"
                    title={isPinned ? 'Désépingler' : 'Épingler'}
                  >
                    {isPinned ? <PinOff className="w-3.5 h-3.5 text-[#FFB020]" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMe) {
                        const all = window.confirm("Voulez-vous supprimer ce message pour tout le monde ? Sinon, il sera supprimé uniquement pour vous.");
                        if (all) {
                          handleDeleteForAll(msg.id);
                        } else {
                          handleDeleteForMe(msg.id);
                        }
                      } else {
                        handleDeleteForMe(msg.id);
                      }
                    }}
                    className="p-1 hover:bg-white/10 rounded-full transition text-white/40 hover:text-red-400"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
                <div className={`flex flex-wrap items-center gap-1.5 mt-1 relative ${isMe ? 'self-end justify-end' : 'self-start justify-start ml-8'}`}>
                  {Object.entries(msg.reactions.reduce((acc: Record<string, string[]>, r) => {
                    acc[r.emoji] = acc[r.emoji] || [];
                    const firstName = r.senderName.split(' ')[0];
                    if (!acc[r.emoji].includes(firstName)) {
                      acc[r.emoji].push(firstName);
                    }
                    return acc;
                  }, {})).map(([emoji, names]) => {
                    const isTooltipActive = activeReactionTooltip?.msgId === msg.id && activeReactionTooltip?.emoji === emoji;
                    return (
                      <div key={emoji} className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionTooltip(prev => (prev?.msgId === msg.id && prev?.emoji === emoji) ? null : { msgId: msg.id, emoji });
                          }}
                          className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded-full border border-white/5 transition-all text-xs cursor-pointer active:scale-95"
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] text-white/70 font-black">{(names as string[]).length}</span>
                        </button>

                        {isTooltipActive && (
                          <div
                            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0F1A30]/95 backdrop-blur-md border border-[#6C5CFF]/30 text-white text-[9px] px-2.5 py-1.5 rounded-xl shadow-xl z-50 whitespace-nowrap animate-fade-in flex flex-col items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-bold text-white/50 block uppercase tracking-wider text-[7.5px]">Réagi par</span>
                            <span className="font-semibold text-white/95">{(names as string[]).join(', ')}</span>
                            {/* Little arrow indicator */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F1A30]/95"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        {/* Real-time family member typing indicator display */}
        {Object.keys(typingMembers).length > 0 && (
          <div className="flex items-center space-x-1.5 ml-8 text-[11px] text-[#00D26A] italic py-1 animate-pulse">
            <span className="w-1.5 h-1.5 bg-[#00D26A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-[#00D26A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-[#00D26A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            <span>{Object.values(typingMembers).join(', ')} {Object.keys(typingMembers).length > 1 ? "sont en train d'écrire..." : "est en train d'écrire..."}</span>
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

      {/* Replying Preview Banner */}
      {replyingToMessage && (
        <div className="flex shrink-0 items-center justify-between px-4 py-2 bg-[#6C5CFF]/20 border-t border-[#6C5CFF]/30 backdrop-blur-md animate-fade-in">
          <div className="flex-1 min-w-0 border-l-2 border-[#00D26A] pl-2 py-0.5">
            <span className="text-[10px] font-black text-[#00D26A] block mb-0.5">Répondre à {replyingToMessage.senderName}</span>
            <span className="text-[11px] text-white/70 truncate block italic">
              {(() => {
                let text = replyingToMessage.content;
                if (replyingToMessage.content.startsWith('{"replyToId":')) {
                  text = parseReplyText(replyingToMessage.content);
                }
                return replyingToMessage.type === 'text' ? text : replyingToMessage.type === 'image' ? '📷 Image' : replyingToMessage.type === 'voice' ? '🎤 Audio' : '📄 Document';
              })()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1 hover:bg-white/10 rounded-full transition shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 border-t border-white/10 bg-white/5 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl">
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
              accept="image/*,application/pdf,text/plain"
              onChange={handleMediaUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
              title="Ajouter un fichier (Image, PDF, Texte)"
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
              onChange={(e) => {
                setNewMessage(e.target.value);
                const channel = activeTypingChannelRef.current;
                if (channel && activeUser) {
                  const now = Date.now();
                  if (now - lastTypingSentRef.current > 2000) {
                    lastTypingSentRef.current = now;
                    channel.send({
                      type: 'broadcast',
                      event: 'typing',
                      payload: { memberId: activeMemberId, name: activeUser.name, isTyping: true }
                    });
                    setTimeout(() => {
                      if (activeTypingChannelRef.current === channel) {
                        channel.send({
                          type: 'broadcast',
                          event: 'typing',
                          payload: { memberId: activeMemberId, name: activeUser.name, isTyping: false }
                        });
                      }
                    }, 3000);
                  }
                }
              }}
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
