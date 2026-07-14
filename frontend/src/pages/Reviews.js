import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Star, Quotes } from "@phosphor-icons/react";
import TestimonialShowcase from "@/components/TestimonialShowcase";
import { useTranslation } from "react-i18next";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const { t } = useTranslation();
  useEffect(() => { api.get("/testimonials").then(({ data }) => setReviews(data)); }, []);

  const stats = [
    { k: "12k+", v: "5-star reviews" },
    { k: "98%", v: "Would recommend" },
    { k: "40+", v: "Cities served" },
    { k: "5k+", v: "Verified specialists" },
  ];

  const wall = reviews.length > 0 ? reviews : [
    { id: "1", user_name: "Aanya Malhotra", rating: 5, comment: "The Signature Facial at home felt like a real spa visit. Skin has never looked calmer." },
    { id: "2", user_name: "Ravi Patel", rating: 5, comment: "Punctual, warm and exceptionally skilled. The men's grooming kit is worth every rupee." },
    { id: "3", user_name: "Zara Khan", rating: 5, comment: "Bridal makeup that lasted 14 hours through my wedding. Would book them again in a heartbeat." },
    { id: "4", user_name: "Meera Sharma", rating: 5, comment: "Advanced membership pays for itself in three sessions. Priority slots are a lifesaver." },
    { id: "5", user_name: "Daniel Chen", rating: 4, comment: "Beautiful experience, gentle products. Only ask — a couple more evening slots would be perfect." },
    { id: "6", user_name: "Priya Rao", rating: 5, comment: "The aromatherapy spa is honestly better than the boutique studios I've tried." },
  ];

  return (
    <div>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="eyebrow mb-3">{t("common.reviews")}</div>
          <h1 className="font-serif-luxe text-5xl sm:text-6xl">Loved by 200,000+ guests.</h1>
          <p className="text-[#4A4A4A] mt-4 max-w-xl mx-auto">Real voices from members who've stopped visiting salons — because we come to them.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6 pb-8">
          {stats.map((s) => (
            <div key={s.k} className="text-center">
              <div className="font-serif-luxe text-4xl text-[#1A1A1A]">{s.k}</div>
              <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-2 font-semibold">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <TestimonialShowcase reviews={reviews} />

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <h2 className="font-serif-luxe text-3xl mb-8">Every review, unfiltered.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {wall.map((r) => (
            <div key={r.id} className="p-6 bg-white border border-[#EAE3D6] rounded-2xl card-lift">
              <Quotes size={22} weight="fill" className="text-[#E07A5F]" />
              <p className="mt-3 text-[#1A1A1A] leading-relaxed font-serif-luxe text-xl">"{r.comment}"</p>
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-[#4A4A4A] font-medium">— {r.user_name}</div>
                <div className="flex gap-1">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
