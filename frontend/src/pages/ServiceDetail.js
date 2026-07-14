import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Star, Clock, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { formatINR } from "@/i18n";

export default function ServiceDetail() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const hi = i18n.language?.startsWith("hi");

  const load = () => api.get(`/services/${id}`).then(({ data }) => setS(data));
  useEffect(() => { load(); }, [id]);

  const addToCart = async () => {
    if (!user) { toast.error("Please sign in first"); navigate("/login"); return; }
    await api.post("/cart/add", { service_id: id, quantity: 1 });
    toast.success(`${s.name} added to bag`);
  };

  const submitReview = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    if (!comment.trim()) { toast.error("Add a short comment"); return; }
    await api.post("/reviews", { service_id: id, rating, comment });
    toast.success("Thanks for your review!");
    setComment(""); setRating(5);
    load();
  };

  if (!s) return <div className="p-16 text-center text-[#4A4A4A]">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <img src={s.image} alt={s.name} className="w-full h-[540px] object-cover rounded-3xl" />
        </div>
        <div className="lg:col-span-5">
          <div className="eyebrow mb-3">{hi && s.category_hi ? s.category_hi : s.category}</div>
          <h1 className="font-serif-luxe text-5xl tracking-tight" data-testid="service-detail-name">{hi && s.name_hi ? s.name_hi : s.name}</h1>
          <div className="mt-4 flex items-center gap-6 text-sm text-[#4A4A4A]">
            <div className="flex items-center gap-1"><Star size={16} weight="fill" className="text-[#E07A5F]" /> {s.rating || 4.6} · {s.review_count || 0} reviews</div>
            <div className="flex items-center gap-1"><Clock size={16} weight="duotone" /> {s.duration_min} {t("common.minutes")}</div>
          </div>
          <p className="mt-6 text-[#4A4A4A] leading-relaxed">{hi && s.description_hi ? s.description_hi : s.description}</p>

          <div className="mt-8 p-6 rounded-2xl bg-white border border-[#EAE3D6]">
            <div className="flex items-baseline gap-3">
              <span className="font-serif-luxe text-4xl">{formatINR(s.price)}</span>
              <span className="text-sm text-[#4A4A4A]">{t("common.perSession")} · at-home</span>
            </div>
            <Button
              className="btn-primary-ink rounded-full h-12 px-8 mt-6 w-full font-semibold"
              onClick={addToCart}
              data-testid="add-to-cart-btn"
            >
              {t("common.addToBag")}
            </Button>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#4A4A4A]">
              <div className="flex items-center gap-2"><ShieldCheck size={16} weight="duotone" /> Hygiene-first</div>
              <div className="flex items-center gap-2"><Sparkle size={16} weight="duotone" /> Premium products</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-20 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <h2 className="font-serif-luxe text-3xl mb-6">Reviews from our members</h2>
          {(!s.reviews || s.reviews.length === 0) && (
            <div className="text-[#4A4A4A] text-sm">No reviews yet — be the first.</div>
          )}
          <div className="space-y-6">
            {s.reviews?.map((r) => (
              <div key={r.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="font-serif-luxe text-lg">{r.user_name}</div>
                  <div className="flex items-center gap-1 text-sm">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#4A4A4A]">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
            <h3 className="font-serif-luxe text-xl">Leave a review</h3>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} data-testid={`review-star-${n}`}>
                  <Star size={26} weight={n <= rating ? "fill" : "regular"} className="text-[#E07A5F]" />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              className="mt-4"
              data-testid="review-comment-input"
            />
            <Button onClick={submitReview} className="btn-primary-ink mt-4 rounded-full" data-testid="submit-review-btn">
              Submit review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
