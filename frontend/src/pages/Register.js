import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent"></div>
        <div className="absolute bottom-10 left-10 text-white max-w-sm">
          <div className="font-serif-luxe text-4xl">Book your first ritual today.</div>
        </div>
      </div>
      <div className="flex items-center justify-center px-8 py-14">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="font-serif-luxe text-4xl">Create your account</h1>
          <p className="text-sm text-[#4A4A4A] mt-2">Join the DH Salon community.</p>
          <div className="mt-8 space-y-4">
            <div>
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="reg-name-input" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="reg-email-input" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="reg-phone-input" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} data-testid="reg-password-input" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="btn-primary-ink rounded-full h-12 w-full mt-8" data-testid="reg-submit-btn">
            {loading ? "Creating..." : "Create account"}
          </Button>
          <p className="text-sm text-[#4A4A4A] mt-6 text-center">
            Already have an account? <Link to="/login" className="text-[#E07A5F] underline underline-offset-4">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
