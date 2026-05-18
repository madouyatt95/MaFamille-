import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Paperclip, CheckCheck, MessageCircle, Users, ArrowLeft, Phone, Video, Search } from 'lucide-react';
import type { Member, ChatMessage, ChatGroup } from '../../types';

interface MessagerieProps {
  members: Member[];
  activeMemberId: string;
}

export const Messagerie: React.FC<MessagerieProps> = ({ members, activeMemberId }) => {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeUser = members.find(m => m.id === activeMemberId);
  const isParent = activeUser?.role === 'parent';

  // Initialize Demo Data
  useEffect(() => {
    const parentIds = members.filter(m => m.role === 'parent').map(m => m.id);
    const allIds = members.map(m => m.id);

    const defaultGroups: ChatGroup[] = [
      { id: 'g_family', name: 'Famille ❤️', isPrivate: false, memberIds: allIds, lastMessage: 'À table dans 10 min !', lastMessageTime: '19:45' },
    ];
    if (isParent) {
      defaultGroups.push({ id: 'g_parents', name: 'Parents (Secret)', isPrivate: true, memberIds: parentIds, lastMessage: 'Tu as payé la facture ?', lastMessageTime: '14:20' });
    }

    setGroups(defaultGroups);

    // Some demo messages
    setMessages([
      { id: 'm1', groupId: 'g_family', senderId: members.find(m => m.role === 'parent')?.id || '1', senderName: members.find(m => m.role === 'parent')?.name || 'Parent', type: 'text', content: 'N\'oubliez pas vos affaires de sport demain !', timestamp: '18:30', readBy: allIds },
      { id: 'm2', groupId: 'g_family', senderId: members.find(m => m.role === 'child')?.id || '3', senderName: members.find(m => m.role === 'child')?.name || 'Enfant', type: 'text', content: 'Oui c\'est déjà dans le sac 🎒', timestamp: '18:35', readBy: allIds },
      { id: 'm3', groupId: 'g_family', senderId: members.find(m => m.role === 'parent')?.id || '1', senderName: members.find(m => m.role === 'parent')?.name || 'Parent', type: 'text', content: 'À table dans 10 min !', timestamp: '19:45', readBy: [activeMemberId] },
    ]);
  }, [members, isParent, activeMemberId]);

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
          {groups.map(group => (
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
