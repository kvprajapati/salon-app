import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Star, Quotes } from "@phosphor-icons/react";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => { api.get("/testimonials").then(({ data }) => setReviews(data)); }, []);

  const stats = [
    { k: "12k+", v: "5-star reviews" },
    { k: "98%", v: "Would recommend" },
    { k: "40+", v: "Cities served" },
    { k: "5k+", v: "Verified specialists" },
  ];

  return (
    <div>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="eyebrow mb-3">Reviews</div>
          <h1 className="font-serif-luxe text-5xl sm:text-6xl">Loved by 200,000+ guests.</h1>
          <p className="text-[#4A4A4A] mt-4 max-w-xl mx-auto">Real voices from members who've stopped visiting salons — because we come to them.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6 pb-12">
          {stats.map((s) => (
            <div key={s.k} className="text-center">
              <div className="font-serif-luxe text-4xl text-[#1A1A1A]">{s.k}</div>
              <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-2">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        {reviews.length === 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "Aanya M.", r: 5, c: "The Signature Facial at home felt like a real spa visit. Skin has never looked calmer." },
              { n: "Ravi P.", r: 5, c: "Punctual, warm and exceptionally skilled. The men's grooming kit is worth every dollar." },
              { n: "Zara K.", r: 5, c: "Bridal makeup that lasted 14 hours through my wedding. Would book them again in a heartbeat." },
              { n: "Meera S.", r: 5, c: "Advanced membership pays for itself in three sessions. Priority slots are a lifesaver." },
              { n: "Daniel C.", r: 4, c: "Beautiful experience, gentle products. Only ask — a couple more evening slots would be perfect." },
              { n: "Priya R.", r: 5, c: "The aromatherapy spa is honestly better than the boutique studios I've tried." },
            ].map((t, i) => (
              <div key={i} className="p-6 bg-white border border-[#EAE3D6] rounded-2xl card-lift">
                <Quotes size={22} weight="fill" className="text-[#E07A5F]" />
                <p className="mt-3 text-[#1A1A1A] leading-relaxed font-serif-luxe text-xl">"{t.c}"</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-[#4A4A4A]">— {t.n}</div>
                  <div className="flex gap-1">
                    {Array.from({ length: t.r }).map((_, i) => <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <div key={r.id} className="p-6 bg-white border border-[#EAE3D6] rounded-2xl card-lift">
                <Quotes size={22} weight="fill" className="text-[#E07A5F]" />
                <p className="mt-3 text-[#1A1A1A] leading-relaxed font-serif-luxe text-xl">"{r.comment}"</p>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-[#4A4A4A]">— {r.user_name}</div>
                  <div className="flex gap-1">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
