import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import useSEO from "@/hooks/useSEO";

export default function Memberships() {
  useSEO({ title: "Memberships · Basic ₹499 / Premium ₹1999", description: "Save up to 25% on every ritual with DH Salon memberships. Basic ₹499, Advanced ₹999, Premium ₹1,999 with priority slots and complimentary treatments.", path: "/memberships" });
  const [plans, setPlans] = useState([]);
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get("/memberships/plans").then(({ data }) => setPlans(data)); }, []);

  const subscribe = async (planId) => {
    if (!user) { toast.error("Sign in to subscribe"); navigate("/login"); return; }
    setLoadingPlan(planId);
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
        kind: "membership",
        plan_id: planId,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Something went wrong");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="text-center mb-14">
        <div className="eyebrow mb-3">The DH Circle</div>
        <h1 className="font-serif-luxe text-5xl sm:text-6xl tracking-tight">Membership, redefined.</h1>
        <p className="mt-4 text-[#4A4A4A] max-w-2xl mx-auto">Curated for our most loyal guests — better prices, complimentary rituals, and a beauty concierge you can text at any hour.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isPremium = p.id === "premium";
          const isAdvanced = p.id === "advanced";
          return (
            <div
              key={p.id}
              data-testid={`plan-card-${p.id}`}
              className={`relative rounded-3xl p-8 card-lift border transition-colors
                ${isPremium ? "bg-[#1A1A1A] text-[#F4EFE6] border-[#1A1A1A]" : ""}
                ${isAdvanced ? "bg-white border-[#E07A5F] shadow-[0_20px_50px_-20px_rgba(224,122,95,0.4)]" : ""}
                ${!isPremium && !isAdvanced ? "bg-[#F4EFE6] border-[#EAE3D6]" : ""}
              `}
            >
              {isAdvanced && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E07A5F] text-white text-xs uppercase tracking-widest px-4 py-1 rounded-full">Most loved</div>
              )}
              {isPremium && (
                <Crown size={26} weight="duotone" className="text-[#F4EFE6]" />
              )}
              <h2 className={`font-serif-luxe text-3xl mt-2 ${isPremium ? "text-[#F4EFE6]" : "text-[#1A1A1A]"}`}>{p.name}</h2>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`font-serif-luxe text-5xl ${isPremium ? "text-[#F4EFE6]" : "text-[#1A1A1A]"}`}>₹{Number(p.price).toLocaleString("en-IN")}</span>
                <span className={`text-sm ${isPremium ? "text-[#DAD3C2]" : "text-[#4A4A4A]"}`}>/ {p.duration_days} days</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3">
                    <Check size={18} weight="bold" className={isPremium ? "text-[#E07A5F] mt-0.5" : "text-[#8F9779] mt-0.5"} />
                    <span className={isPremium ? "text-[#DAD3C2]" : "text-[#4A4A4A]"}>{perk}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => subscribe(p.id)}
                disabled={loadingPlan === p.id}
                data-testid={`subscribe-${p.id}-btn`}
                className={`mt-10 w-full h-12 rounded-full
                  ${isPremium ? "bg-[#F4EFE6] text-[#1A1A1A] hover:bg-white" : "btn-primary-ink"}
                `}
              >
                {loadingPlan === p.id ? "Redirecting..." : `Choose ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
