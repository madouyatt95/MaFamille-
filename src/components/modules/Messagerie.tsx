import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Paperclip, CheckCheck, MessageCircle, Users, ArrowLeft, Phone, Video, Search, Palette, X } from 'lucide-react';
import type { Member, ChatMessage, ChatGroup } from '../../types';

interface MessagerieProps {
  members: Member[];
  activeMemberId: string;
  groups: ChatGroup[];
  setGroups: React.Dispatch<React.SetStateAction<ChatGroup[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const Messagerie: React.FC<MessagerieProps> = ({ 
  members, 
  activeMemberId,
  groups,
  setGroups,
  messages,
  setMessages
}) => {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [drawColor, setDrawColor] = useState('#FF4D6D');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeUser = members.find(m => m.id === activeMemberId);

  // Initialization of groups is handled by App.tsx. 
  // We can just automatically select the first group if none is selected.
  useEffect(() => {
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
  }, []);

  // Mark group messages as read by activeMemberId
  useEffect(() => {
    if (!activeGroupId || !activeMemberId) return;
    const hasUnread = messages.some(m => m.groupId === activeGroupId && !m.readBy.includes(activeMemberId));
    if (hasUnread) {
      setMessages(prev => prev.map(m => {
        if (m.groupId === activeGroupId && !m.readBy.includes(activeMemberId)) {
          return { ...m, readBy: [...m.readBy, activeMemberId] };
        }
        return m;
      }));
    }
  }, [activeGroupId, activeMemberId, messages, setMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeGroupId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroupId || !activeUser) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      groupId: activeGroupId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      type: 'text',
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      readBy: [activeUser.id]
    };

    setMessages(prev => [...prev, newMsg]);
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: newMsg.content, lastMessageTime: newMsg.timestamp } : g));
    setNewMessage('');
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
      }
    };
    reader.readAsDataURL(file);
  };

  const simulateVoiceMessage = () => {
    if (!activeGroupId || !activeUser) return;
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        groupId: activeGroupId,
        senderId: activeUser.id,
        senderName: activeUser.name,
        type: 'voice',
        content: 'Audio_0:12', // Simulated audio component
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        readBy: [activeUser.id]
      };
      setMessages(prev => [...prev, newMsg]);
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: '🎤 Message vocal', lastMessageTime: newMsg.timestamp } : g));
    }, 2000);
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
      <div className="flex flex-col h-full bg-[#07111F] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#112240]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#00D26A]/20 rounded-xl border border-[#00D26A]/30">
              <MessageCircle className="w-6 h-6 text-[#00D26A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Messages</h2>
              <p className="text-xs text-white/50">Connecté en tant que {activeUser?.name}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          {visibleGroups.map(group => (
            <div 
              key={group.id} 
              onClick={() => setActiveGroupId(group.id)}
              className="flex items-center p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C5CFF] to-[#00D26A] flex items-center justify-center shrink-0 mr-4 shadow-lg shadow-[#6C5CFF]/20">
                {group.isPrivate ? <Users className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-sm truncate">{group.name}</h3>
                  <span className="text-xs text-white/40">{group.lastMessageTime}</span>
                </div>
                <p className="text-xs text-white/60 truncate">{group.lastMessage}</p>
              </div>
            </div>
          ))}
          
          {/* Members Direct Messages (Mocked) */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Messages Privés</h4>
            {members.filter(m => m.id !== activeMemberId).map(member => (
              <div 
                key={member.id} 
                onClick={() => handleOpenDirectMessage(member)}
                className="flex items-center p-3 -mx-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover mr-4" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{member.name}</h3>
                  <p className="text-xs text-white/40">Appuyez pour envoyer un message</p>
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C5CFF] to-[#00D26A] flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            {activeGroup?.isPrivate && activeGroup.memberIds.length === 2 ? (
              <img src={members.find(m => m.id !== activeMemberId && activeGroup.memberIds.includes(m.id))?.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : activeGroup?.isPrivate ? <Users className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="text-base font-bold">{activeGroup?.name}</h2>
            <p className="text-[10px] text-white/50">{activeGroup?.memberIds.length} membres</p>
          </div>
        </div>
        <div className="flex space-x-1">
          <button className="p-2 hover:bg-white/10 rounded-full"><Video className="w-5 h-5 text-[#00D26A]" /></button>
          <button className="p-2 hover:bg-white/10 rounded-full"><Phone className="w-5 h-5 text-[#00D26A]" /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0A0D18] to-[#121829]">
        {activeMessages.map(msg => {
          const isMe = msg.senderId === activeUser?.id;
          const sender = members.find(m => m.id === msg.senderId);
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-[10px] text-white/50 mb-1 ml-2">{msg.senderName}</span>}
              <div className="flex items-end space-x-2 max-w-[80%]">
                {!isMe && sender && (
                  <img src={sender.photoUrl} alt={sender.name} className="w-6 h-6 rounded-full object-cover shrink-0 mb-1" />
                )}
                
                <div className={`p-3 rounded-2xl ${isMe ? 'bg-[#00D26A] text-black rounded-br-sm' : 'bg-[#1C2C4E] text-white rounded-bl-sm'}`}>
                  {msg.type === 'text' && <p className="text-sm">{msg.content}</p>}
                  {msg.type === 'image' && <img src={msg.content} alt="Media" className="rounded-xl max-h-48 object-cover" />}
                  {msg.type === 'voice' && (
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-full ${isMe ? 'bg-black/10' : 'bg-[#6C5CFF]/20'}`}>
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="w-24 h-1 bg-black/10 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-current rounded-full"></div>
                      </div>
                      <span className="text-xs font-medium">0:12</span>
                    </div>
                  )}
                  
                  <div className={`flex items-center justify-end space-x-1 mt-1 ${isMe ? 'text-black/50' : 'text-white/40'}`}>
                    <span className="text-[9px]">{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </div>
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
      <div className="p-3 bg-[#112240] border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-full border border-white/10">
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
              onClick={simulateVoiceMessage}
              className="p-2.5 bg-[#6C5CFF] text-white rounded-full hover:scale-105 transition-transform"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
