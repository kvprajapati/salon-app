import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkle } from "@phosphor-icons/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent"></div>
        <div className="absolute bottom-10 left-10 text-white max-w-sm">
          <Sparkle size={28} weight="duotone" />
          <div className="font-serif-luxe text-4xl mt-3">Welcome back to your ritual.</div>
        </div>
      </div>
      <div className="flex items-center justify-center px-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="font-serif-luxe text-4xl">Sign in</h1>
          <p className="text-sm text-[#4A4A4A] mt-2">Enter your details to continue.</p>
          <div className="mt-8 space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="btn-primary-ink rounded-full h-12 w-full mt-8" data-testid="login-submit-btn">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-[#4A4A4A] mt-6 text-center">
            New here? <Link to="/register" className="text-[#E07A5F] underline underline-offset-4" data-testid="link-register">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
