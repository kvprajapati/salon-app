import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle, Handshake, ClockCounterClockwise, Coins } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

const SPECIALIZATIONS = ["Facial", "Spa", "Waxing", "Hair Care", "Makeup", "Men's Grooming", "Nails", "Bridal"];

export default function RegisterProfessional() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", city: "", category: "", gender: "female",
    experience_years: 1, specializations: [], id_proof_type: "Aadhaar",
    id_proof_number: "", portfolio_url: "", about: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get("/professionals/categories").then(({ data }) => setCategories(data));
  }, []);

  const toggleSpec = (s) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.city) {
      toast.error("Please fill required fields"); return;
    }
    if (!form.category) {
      toast.error("Please select a professional category"); return;
    }
    if (form.specializations.length === 0) {
      toast.error("Select at least one specialization"); return;
    }
    setLoading(true);
    try {
      await api.post("/professionals/register", { ...form, experience_years: Number(form.experience_years) });
      setSubmitted(true);
      toast.success("Application submitted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-16 text-center">
        <CheckCircle size={72} weight="duotone" className="mx-auto text-[#8F9779]" />
        <h1 className="font-serif-luxe text-5xl mt-6">{t("pro.successTitle")}</h1>
        <p className="text-[#4A4A4A] mt-4 max-w-xl mx-auto">
          {t("pro.successBody")} <b>{form.email}</b>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Join the roster</div>
            <h1 className="font-serif-luxe text-5xl lg:text-6xl leading-[1.05]">
              {t("pro.heading")}
            </h1>
            <p className="text-[#4A4A4A] mt-6 max-w-lg leading-relaxed">{t("pro.subheading")}</p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: <Coins size={22} weight="duotone" />, t: "Up to 3× income", d: "vs. traditional salons" },
                { icon: <ClockCounterClockwise size={22} weight="duotone" />, t: "Flexible hours", d: "Own your calendar" },
                { icon: <Handshake size={22} weight="duotone" />, t: "Verified clients", d: "No walk-in stress" },
              ].map((v, i) => (
                <div key={i} className="text-[#E07A5F]">
                  {v.icon}
                  <div className="text-sm font-semibold text-[#1A1A1A] mt-2">{v.t}</div>
                  <div className="text-xs text-[#4A4A4A]">{v.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6">
            <img className="rounded-3xl h-[420px] w-full object-cover"
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80" alt="pro" />
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
        <form onSubmit={submit} className="p-8 bg-white border border-[#EAE3D6] rounded-3xl space-y-8" data-testid="pro-form">
          <h2 className="font-serif-luxe text-3xl">Your application</h2>

          {/* Professional category — mandatory radio */}
          <div>
            <Label className="text-sm font-semibold">{t("pro.category")} *</Label>
            <p className="text-xs text-[#4A4A4A] mt-1">{t("pro.categoryHelp")}</p>
            <RadioGroup
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
              className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
              data-testid="pro-category-radio"
            >
              {categories.map((c) => {
                const id = `cat-${c.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
                const active = form.category === c;
                return (
                  <label
                    key={c}
                    htmlFor={id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${active ? "border-[#1A1A1A] bg-[#F4EFE6]" : "border-[#EAE3D6] hover:border-[#1A1A1A]"}`}
                    data-testid={`pro-category-${id}`}
                  >
                    <RadioGroupItem value={c} id={id} className="border-[#1A1A1A]" />
                    <span className="text-sm font-semibold">{c}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="pro-fullname-input" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="pro-email-input" /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="pro-phone-input" /></div>
            <div><Label>City *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="pro-city-input" /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger data-testid="pro-gender-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Years of experience</Label>
              <Input type="number" min="0" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} data-testid="pro-exp-input" />
            </div>
            <div>
              <Label>ID proof</Label>
              <Select value={form.id_proof_type} onValueChange={(v) => setForm({ ...form, id_proof_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="PAN">PAN</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ID number</Label><Input value={form.id_proof_number} onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Label>Portfolio / Instagram (optional)</Label>
              <Input placeholder="https://instagram.com/…" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>{t("pro.specializations")} *</Label>
            <div className="mt-3 flex flex-wrap gap-2" data-testid="pro-specializations">
              {SPECIALIZATIONS.map((s) => (
                <button type="button" key={s} onClick={() => toggleSpec(s)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${form.specializations.includes(s) ? "bg-[#1A1A1A] text-[#F4EFE6] border-[#1A1A1A]" : "bg-white border-[#EAE3D6] hover:border-[#1A1A1A]"}`}
                  data-testid={`pro-spec-${s.replace(/[^a-z]/gi, "").toLowerCase()}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>About you</Label>
            <Textarea rows={4} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="Tell us about your training and clients..." />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="agree" defaultChecked />
            <label htmlFor="agree" className="text-xs text-[#4A4A4A]">I agree to background verification and DH Salon's Code of Conduct.</label>
          </div>

          <Button type="submit" disabled={loading} className="btn-primary-ink rounded-full h-12 px-10 font-semibold" data-testid="pro-submit-btn">
            {loading ? "Submitting..." : t("pro.submit")}
          </Button>
        </form>
      </section>
    </div>
  );
}
