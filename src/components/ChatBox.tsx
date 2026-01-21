import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface ChatBoxProps {
  groupId: string;
  profiles: Record<string, string>;
}

const ChatBox = ({ groupId, profiles }: ChatBoxProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages:group_id=eq.${groupId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log("New message received:", newMsg);
          setMessages((prev) => {
            // Avoid duplicates
            const isDuplicate = prev.some(m => m.id === newMsg.id);
            return isDuplicate ? prev : [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe((status, err) => {
        console.log("Subscription status:", status);
        if (err) {
          console.error("Subscription error:", err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error loading messages",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log("Messages fetched:", data);
      setMessages(data || []);
    } catch (error) {
      console.error("Unexpected error fetching messages:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        group_id: groupId,
        sender_id: user.id,
        text: newMessage.trim(),
      });

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }
      setNewMessage("");
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Group Chat</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground/70">
              Be the first to say hello!
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const messageDate = new Date(message.created_at);
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const prevMessageDate = prevMessage
              ? new Date(prevMessage.created_at)
              : null;

            // Check if we need to show a date separator
            const showDateSeparator =
              !prevMessageDate || !isSameDay(messageDate, prevMessageDate);

            // Get the date label
            const getDateLabel = (date: Date): string => {
              if (isToday(date)) return "Today";
              if (isYesterday(date)) return "Yesterday";
              return format(date, "MMMM d, yyyy");
            };

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-muted/80 text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                      {getDateLabel(messageDate)}
                    </div>
                  </div>
                )}
                <div
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {profiles[message.sender_id] || "Unknown"}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {format(messageDate, "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="p-4 border-t border-border bg-muted/30"
      >
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={sending}
          />
          <Button
            type="submit"
            variant="gradient"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
