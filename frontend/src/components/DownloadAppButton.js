import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AppleLogo, GooglePlayLogo, DeviceMobile } from "@phosphor-icons/react";
import api from "@/lib/api";

export default function DownloadAppButton({ variant = "outline", label = "Download app", className = "" }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const notify = async () => {
    if (!email.match(/^[^@]+@[^@]+\.[^@]+$/)) return toast.error("Enter a valid email");
    try {
      await api.post("/notify/subscribe", { email, channel: "app_launch" });
      setSent(true);
      toast.success("We'll email you when the app is live");
    } catch (e) { toast.error("Please try again"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={`rounded-full ${className}`} data-testid="download-app-btn">
          <DeviceMobile size={16} weight="duotone" className="mr-2" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif-luxe text-3xl">Coming soon to your pocket.</DialogTitle>
          <p className="text-sm text-[#4A4A4A]">Our iOS and Android apps are in the final polish. Get notified the moment we launch.</p>
        </DialogHeader>

        {!sent ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="notify-email-input" />
              <Button onClick={notify} className="btn-primary-ink rounded-full whitespace-nowrap" data-testid="notify-subscribe-btn">Notify me</Button>
            </div>
            <div className="border-t border-[#EAE3D6] pt-4">
              <p className="text-xs uppercase tracking-widest text-[#4A4A4A] mb-3">Or preview our future stores</p>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer" className="p-4 bg-[#1A1A1A] text-[#F4EFE6] rounded-2xl flex items-center gap-3 hover:opacity-90">
                  <AppleLogo size={26} weight="fill" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest opacity-80">Coming to</div>
                    <div className="font-serif-luxe text-lg">App Store</div>
                  </div>
                </a>
                <a href="https://play.google.com/store" target="_blank" rel="noreferrer" className="p-4 bg-[#1A1A1A] text-[#F4EFE6] rounded-2xl flex items-center gap-3 hover:opacity-90">
                  <GooglePlayLogo size={26} weight="fill" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest opacity-80">Coming to</div>
                    <div className="font-serif-luxe text-lg">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="font-serif-luxe text-2xl">You're on the list.</div>
            <p className="text-sm text-[#4A4A4A] mt-2">We'll reach out to <b>{email}</b> at launch.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
