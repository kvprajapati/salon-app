import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkle, Gift, Percent, Crown, Eye, EyeSlash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created — welcome!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="hidden lg:block relative">
        <img src="https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/25 to-transparent"></div>
        <div className="absolute inset-x-10 bottom-14 text-white max-w-md">
          <Sparkle size={30} weight="duotone" className="text-[#E07A5F]" />
          <div className="font-serif-luxe text-4xl lg:text-5xl mt-4 leading-tight">Book your first ritual today.</div>
          <div className="mt-8 space-y-3">
            {[
              { icon: <Gift size={18} weight="duotone" />, t: "₹500 credit on sign-up" },
              { icon: <Percent size={18} weight="duotone" />, t: "Up to 25% off with membership" },
              { icon: <Crown size={18} weight="duotone" />, t: "Priority slots, always" },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90 text-sm">
                <span className="h-8 w-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">{p.icon}</span>
                {p.t}
              </div>
            ))}
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
          <div className="eyebrow mb-3">{t("auth.signupEyebrow")}</div>
          <h1 className="font-serif-luxe text-5xl">{t("auth.signupTitle")}</h1>
          <p className="text-sm text-[#4A4A4A] mt-3">{t("auth.signupSub")}</p>

          <div className="mt-8 space-y-4">
            <div>
              <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="mt-2 h-12 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]" data-testid="reg-name-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="mt-2 h-12 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]" data-testid="reg-email-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-2 h-12 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]" data-testid="reg-phone-input" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-[#4A4A4A]">Password</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
                  className="mt-2 h-12 pr-10 rounded-full bg-white border-[#EAE3D6] focus-visible:ring-[#E07A5F]" data-testid="reg-password-input" />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-[#4A4A4A]">
                  {show ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="btn-primary-ink rounded-full h-12 w-full mt-8 font-semibold" data-testid="reg-submit-btn">
            {loading ? "..." : t("common.signup")}
          </Button>

          <p className="text-xs text-[#4A4A4A] mt-4 text-center">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>

          <p className="text-sm text-[#4A4A4A] mt-8 text-center">
            {t("auth.haveAccount")} <Link to="/login" className="text-[#E07A5F] underline underline-offset-4 font-semibold">{t("common.signIn")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
