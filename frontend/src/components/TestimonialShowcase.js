import { useEffect, useRef, useState } from "react";
import { Star, Quotes, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const AVATAR = (seed) => `https://i.pravatar.cc/120?u=${seed}`;

const DEFAULTS = [
  { name: "Aanya Malhotra", rating: 5, date: "Feb 2, 2026", city: "Mumbai",
    comment: "The Signature Facial at home felt like a real spa visit. My skin has never looked calmer — I've officially cancelled my salon membership." },
  { name: "Ravi Patel", rating: 5, date: "Jan 24, 2026", city: "Bengaluru",
    comment: "Punctual, warm and exceptionally skilled. The men's grooming kit is worth every rupee. Booked twice this month already." },
  { name: "Zara Khan", rating: 5, date: "Jan 12, 2026", city: "Delhi",
    comment: "Bridal makeup that lasted 14 hours through my wedding. Would book them again in a heartbeat for every family function." },
  { name: "Meera Sharma", rating: 5, date: "Dec 30, 2025", city: "Pune",
    comment: "Advanced membership pays for itself in three sessions. Priority slots have been a lifesaver during holiday season." },
  { name: "Daniel Chen", rating: 4, date: "Dec 18, 2025", city: "Hyderabad",
    comment: "Beautiful experience, gentle products. Only ask — a couple more evening slots would be perfect." },
  { name: "Priya Rao", rating: 5, date: "Dec 5, 2025", city: "Chennai",
    comment: "The aromatherapy spa is honestly better than the boutique studios I've tried in Bandra. Highly recommend." },
];

export default function TestimonialShowcase({ reviews }) {
  const { t } = useTranslation();
  const data = (reviews && reviews.length > 0)
    ? reviews.map((r, i) => ({
        name: r.user_name || "Anonymous",
        rating: r.rating,
        date: r.created_at?.slice(0, 10),
        comment: r.comment,
        city: "",
      }))
    : DEFAULTS;

  const [idx, setIdx] = useState(0);
  const timer = useRef(null);

  const next = () => setIdx((i) => (i + 1) % data.length);
  const prev = () => setIdx((i) => (i - 1 + data.length) % data.length);

  useEffect(() => {
    timer.current = setInterval(next, 5500);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  const item = data[idx];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20" data-testid="testimonial-showcase">
      <div className="grid lg:grid-cols-12 gap-8 items-stretch">
        {/* Left summary */}
        <div className="lg:col-span-5 relative rounded-3xl overflow-hidden min-h-[460px]">
          <img
            src="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80"
            alt="salon"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A]/85 via-[#1A1A1A]/60 to-transparent" />
          <div className="relative z-10 p-10 lg:p-12 h-full flex flex-col justify-between text-[#F4EFE6]">
            <div>
              <div className="eyebrow text-[#F4EFE6] opacity-70 mb-4">{t("testimonials.eyebrow")}</div>
              <h2 className="font-serif-luxe text-4xl lg:text-5xl leading-[1.1]">{t("testimonials.title")}</h2>
              <p className="mt-5 text-[#DAD3C2] max-w-md text-sm leading-relaxed">{t("testimonials.subtitle")}</p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="text-3xl font-serif-luxe text-[#F4EFE6]">{t("testimonials.totalReviews").split(" ")[0]}</div>
                <div className="text-xs uppercase tracking-widest opacity-80 mt-1">{t("testimonials.totalReviews").split(" ").slice(1).join(" ")}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="flex items-center gap-1 text-[#E07A5F] text-3xl font-serif-luxe">
                  <Star size={22} weight="fill" /> 4.9
                </div>
                <div className="text-xs uppercase tracking-widest opacity-80 mt-1">Average rating</div>
              </div>
            </div>

            <Link to="/reviews" className="mt-8 inline-flex items-center gap-2 text-sm underline underline-offset-4 opacity-90" data-testid="showcase-read-all">
              {t("testimonials.seeAll")} →
            </Link>
          </div>
        </div>

        {/* Right slider */}
        <div className="lg:col-span-7 relative">
          <div className="relative bg-white border border-[#EAE3D6] rounded-3xl p-10 h-full min-h-[460px] flex flex-col justify-between card-lift">
            <Quotes size={38} weight="fill" className="text-[#E07A5F]" />

            <div key={idx} className="testimonial-slide">
              <p className="font-serif-luxe text-2xl lg:text-3xl leading-snug text-[#1A1A1A] mt-2">
                "{item.comment}"
              </p>
              <div className="mt-8 flex items-center gap-4">
                <img src={AVATAR(item.name)} alt={item.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-[#F4EFE6]" />
                <div>
                  <div className="font-serif-luxe text-xl">{item.name}</div>
                  <div className="text-xs text-[#4A4A4A] flex items-center gap-2 mt-1">
                    <span className="flex gap-0.5">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} size={12} weight="fill" className="text-[#E07A5F]" />
                      ))}
                    </span>
                    {item.date && <span>· {item.date}</span>}
                    {item.city && <span>· {item.city}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-10">
              <div className="flex gap-2">
                {data.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-[#1A1A1A]" : "w-2 bg-[#EAE3D6]"}`}
                    data-testid={`showcase-dot-${i}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={prev} data-testid="showcase-prev"
                  className="h-10 w-10 rounded-full border border-[#EAE3D6] hover:bg-[#1A1A1A] hover:text-[#F4EFE6] transition-colors flex items-center justify-center">
                  <CaretLeft size={16} weight="bold" />
                </button>
                <button onClick={next} data-testid="showcase-next"
                  className="h-10 w-10 rounded-full border border-[#EAE3D6] hover:bg-[#1A1A1A] hover:text-[#F4EFE6] transition-colors flex items-center justify-center">
                  <CaretRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
