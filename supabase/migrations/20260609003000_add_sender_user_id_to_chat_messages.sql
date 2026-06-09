ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_user_id
  ON public.chat_messages(sender_user_id);
