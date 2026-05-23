-- 1. Trigger pour le mur des souvenirs (memories)
DROP TRIGGER IF EXISTS tr_memories_send_push ON public.memories;
CREATE TRIGGER tr_memories_send_push
AFTER INSERT ON public.memories
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

-- 2. Trigger pour les événements de l'agenda (events)
DROP TRIGGER IF EXISTS tr_events_send_push ON public.events;
CREATE TRIGGER tr_events_send_push
AFTER INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

-- 3. Trigger pour les tâches ménagères (chore_tasks)
DROP TRIGGER IF EXISTS tr_chore_tasks_send_push ON public.chore_tasks;
CREATE TRIGGER tr_chore_tasks_send_push
AFTER INSERT OR UPDATE ON public.chore_tasks
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

-- 4. Trigger pour le conseil de famille (votes)
DROP TRIGGER IF EXISTS tr_votes_send_push ON public.votes;
CREATE TRIGGER tr_votes_send_push
AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

-- 5. Trigger pour la liste de courses (groceries)
DROP TRIGGER IF EXISTS tr_groceries_send_push ON public.groceries;
CREATE TRIGGER tr_groceries_send_push
AFTER INSERT OR UPDATE ON public.groceries
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();
