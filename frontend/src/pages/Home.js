import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Star, ArrowRight, Leaf, Clock, ShieldCheck, HandHeart } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { formatINR } from "@/i18n";
import TestimonialShowcase from "@/components/TestimonialShowcase";
import useSEO from "@/hooks/useSEO";

export default function Home() {
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const { t, i18n } = useTranslation();
  const hi = i18n.language?.startsWith("hi");
  const nm = (s) => (hi && s.name_hi ? s.name_hi : s.name);
  const cat = (s) => (hi && s.category_hi ? s.category_hi : s.category);
  useSEO({ title: null, description: "Book premium salon, spa, facial, waxing and makeup at home in 40+ Indian cities. ₹499 memberships, verified specialists, on-time delivery.", path: "/" });

  useEffect(() => {
    api.get("/services").then(({ data }) => setServices(data.slice(0, 6)));
    api.get("/testimonials").then(({ data }) => setReviews(data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 relative z-10">
            <div className="eyebrow mb-6" data-testid="hero-eyebrow">Salon · Spa · Wellness · At Home</div>
            <h1 className="font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-[#1A1A1A]">
              {t("hero.title1")}<br />
              <span className="italic text-[#E07A5F]">{t("hero.title2")}</span> {t("hero.title3")}
            </h1>
            <p className="mt-6 text-lg text-[#4A4A4A] max-w-lg leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex gap-4 flex-wrap">
              <Link to="/services">
                <Button className="btn-primary-ink rounded-full h-12 px-8 font-semibold" data-testid="hero-book-btn">
                  {t("hero.ctaBook")} <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link to="/memberships">
                <Button variant="outline" className="rounded-full h-12 px-8 border-[#1A1A1A] font-semibold" data-testid="hero-membership-btn">
                  {t("hero.ctaMembership")}
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8 text-sm text-[#4A4A4A]">
              <div className="flex items-center gap-2"><Star size={18} weight="fill" className="text-[#E07A5F]" /> {t("hero.rating")}</div>
              <div className="flex items-center gap-2"><ShieldCheck size={18} weight="duotone" /> {t("hero.verified")}</div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-6 gap-3">
              <img className="col-span-4 row-span-2 rounded-3xl h-[420px] object-cover w-full" src="https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" alt="spa" />
              <img className="col-span-2 rounded-3xl h-[204px] object-cover w-full" src="https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="facial" />
              <img className="col-span-2 rounded-3xl h-[204px] object-cover w-full" src="https://images.unsplash.com/photo-1613966802194-d46a163af70d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBtYWtldXAlMjBhcnRpc3R8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" alt="makeup" />
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-y border-[#EAE3D6] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-4 gap-8">
          {[
            { icon: <HandHeart size={26} weight="duotone" />, t: t("values.trained"), d: t("values.trainedD") },
            { icon: <Leaf size={26} weight="duotone" />, t: t("values.clean"), d: t("values.cleanD") },
            { icon: <ShieldCheck size={26} weight="duotone" />, t: t("values.hygiene"), d: t("values.hygieneD") },
            { icon: <Clock size={26} weight="duotone" />, t: t("values.onTime"), d: t("values.onTimeD") },
          ].map((v, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="text-[#E07A5F]">{v.icon}</div>
              <div>
                <div className="font-serif-luxe text-xl">{v.t}</div>
                <div className="text-sm text-[#4A4A4A] mt-1">{v.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services one-glance */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="eyebrow mb-3">{t("menu.eyebrow")}</div>
            <h2 className="font-serif-luxe text-4xl sm:text-5xl tracking-tight">{t("menu.heading")}</h2>
          </div>
          <Link to="/services" className="hidden sm:inline-flex items-center gap-2 text-sm text-[#1A1A1A] underline underline-offset-4 font-semibold" data-testid="view-all-services-link">
            {t("menu.viewAll")} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-6">
          {services.map((s, idx) => (
            <Link
              key={s.id}
              to={`/services/${s.id}`}
              data-testid={`home-service-card-${s.id}`}
              className={`card-lift relative overflow-hidden rounded-3xl bg-white border border-[#EAE3D6] group
                ${idx === 0 ? "md:col-span-5 lg:col-span-7 row-span-2" : "md:col-span-3 lg:col-span-5"}
                ${idx === 3 ? "md:col-span-4 lg:col-span-5" : ""}
              `}
            >
              <div className={`relative ${idx === 0 ? "h-[440px]" : "h-[220px]"}`}>
                <img src={s.image} alt={nm(s)} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="text-xs uppercase tracking-widest opacity-80 font-semibold">{cat(s)}</div>
                  <div className="font-serif-luxe text-2xl mt-1">{nm(s)}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{t("common.from")} {formatINR(s.price)}</span>
                    <span className="text-sm underline underline-offset-4 opacity-90">{t("common.bookNow")}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonial showcase */}
      <TestimonialShowcase reviews={reviews} />

      {/* Membership CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="rounded-3xl overflow-hidden relative bg-[#1A1A1A] text-[#F4EFE6] p-10 md:p-16">
          <div className="max-w-2xl">
            <div className="eyebrow text-[#F4EFE6] opacity-70 mb-4">{t("membership.eyebrow")}</div>
            <h3 className="font-serif-luxe text-4xl sm:text-5xl">{t("membership.heading")}</h3>
            <p className="mt-4 text-[#DAD3C2] leading-relaxed">{t("membership.subtitle")}</p>
            <Link to="/memberships">
              <Button className="mt-8 rounded-full h-12 px-8 bg-[#F4EFE6] text-[#1A1A1A] hover:bg-white font-semibold" data-testid="cta-memberships-btn">
                {t("membership.cta")} <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
