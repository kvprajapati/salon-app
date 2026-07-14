import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatCircleDots, PaperPlaneRight, X, Sparkle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open || !user) return;
    api.get("/chat/history").then(({ data }) => {
      if (data.length > 0) {
        setMessages(data);
        setSessionId(data[data.length - 1].session_id);
      } else {
        setMessages([{
          role: "assistant",
          content: `Hello ${user.name.split(" ")[0]} — I'm Aria, your DH Salon concierge. How can I help today?`,
        }]);
      }
    });
  }, [open, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/chat/send", { message: msg, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't respond just now. Please try again or email hello@dhsalon.com." }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="chat-widget-open-btn"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#1A1A1A] text-[#F4EFE6] shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open support chat"
      >
        <ChatCircleDots size={26} weight="duotone" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white p-0 gap-0 sm:rounded-3xl overflow-hidden">
          <DialogHeader className="p-5 bg-[#1A1A1A] text-[#F4EFE6]">
            <DialogTitle className="font-serif-luxe text-2xl flex items-center gap-2">
              <Sparkle size={20} weight="duotone" className="text-[#E07A5F]" /> Aria · DH Concierge
            </DialogTitle>
            <p className="text-xs text-[#DAD3C2] mt-1">Powered by AI · replies in seconds</p>
          </DialogHeader>

          {!user ? (
            <div className="p-8 text-center">
              <p className="text-[#4A4A4A] text-sm">Please sign in to chat with our concierge.</p>
              <Link to="/login"><Button className="btn-primary-ink rounded-full mt-4">Sign in</Button></Link>
            </div>
          ) : (
            <>
              <div className="h-[380px] overflow-y-auto p-4 space-y-3 bg-[#FDFBF7]" data-testid="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user" ? "bg-[#1A1A1A] text-[#F4EFE6]" : "bg-white border border-[#EAE3D6] text-[#1A1A1A]"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-2xl bg-white border border-[#EAE3D6] text-sm text-[#4A4A4A]">Aria is typing...</div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <div className="p-4 border-t border-[#EAE3D6] flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about bookings, refunds, memberships..."
                  disabled={loading}
                  data-testid="chat-input"
                />
                <Button onClick={send} disabled={loading} className="btn-primary-ink" data-testid="chat-send-btn">
                  <PaperPlaneRight size={18} weight="duotone" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
