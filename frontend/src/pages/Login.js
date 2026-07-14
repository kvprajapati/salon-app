import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkle, Quotes, Star, Eye, EyeSlash } from "@phosphor-icons/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sign-in failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent"></div>
        <div className="absolute inset-x-10 bottom-14 text-white">
          <Sparkle size={30} weight="duotone" className="text-[#E07A5F]" />
          <div className="font-serif-luxe text-4xl lg:text-5xl mt-4 leading-tight max-w-md">Welcome back to your ritual.</div>
          <div className="mt-8 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 max-w-md">
            <Quotes size={20} weight="fill" className="text-[#E07A5F]" />
            <p className="mt-2 text-white/90 text-sm leading-relaxed">
              "The moment my specialist walks in, my apartment turns into a boutique spa. I'll never step into a salon again."
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} weight="fill" className="text-[#E07A5F]" />)}
              </div>
              <span>— Aanya M., Premium member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 lg:px-16 py-14 bg-[#FDFBF7]">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <Sparkle size={26} weight="duotone" className="text-[#E07A5F]" />
            <span className="font-serif-luxe text-2xl">DH Salon</span>
          </Link>
          <div className="eyebrow mb-3">Members</div>
          <h1 className="font-serif-luxe text-5xl">Sign in.</h1>
          <p className="text-sm text-[#4A4A4A] mt-3">Continue your beauty journey with us.</p>

          <div className="mt-10 space-y-5">
            <div>
              <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="mt-2 h-12 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]"
                placeholder="you@email.com" data-testid="login-email-input" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Password</Label>
                <Link to="#" className="text-xs text-[#E07A5F]">Forgot?</Link>
              </div>
              <div className="relative">
                <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="mt-2 h-12 pr-10 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]"
                  placeholder="••••••••" data-testid="login-password-input" />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-[#4A4A4A]" data-testid="toggle-pw">
                  {show ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="btn-primary-ink rounded-full h-12 w-full mt-8" data-testid="login-submit-btn">
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-sm text-[#4A4A4A] mt-8 text-center">
            New here? <Link to="/register" className="text-[#E07A5F] underline underline-offset-4" data-testid="link-register">Create an account</Link>
          </p>

          <div className="mt-10 p-4 bg-[#F4EFE6] rounded-2xl text-xs text-[#4A4A4A] text-center">
            Are you a beauty professional?{" "}
            <Link to="/register-professional" className="text-[#1A1A1A] underline underline-offset-4 font-medium" data-testid="link-pro">Join our roster</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
