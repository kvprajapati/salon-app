import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Star } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { formatINR } from "@/i18n";
import useSEO from "@/hooks/useSEO";

export default function Services() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  useSEO({ title: category ? `${category} Services` : "All Services", description: "Book salon, spa, facial, waxing, hair and makeup services at home starting ₹899.", path: "/services" });
  const { t, i18n } = useTranslation();
  const hi = i18n.language?.startsWith("hi");
  const nm = (s) => (hi && s.name_hi ? s.name_hi : s.name);
  const cat = (s) => (hi && s.category_hi ? s.category_hi : s.category);

  useEffect(() => {
    api.get("/services").then(({ data }) => setServices(data));
    api.get("/services/categories").then(({ data }) => setCategories(data));
  }, []);

  const filtered = category ? services.filter((s) => s.category === category) : services;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="mb-10">
        <div className="eyebrow mb-3">{t("menu.eyebrow")}</div>
        <h1 className="font-serif-luxe text-5xl tracking-tight">{t("menu.heading")}</h1>
        <p className="mt-3 text-[#4A4A4A] max-w-xl">Filter by category or browse the full menu. Every treatment is delivered at your home by verified specialists.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-10" data-testid="category-filters">
        <button
          onClick={() => setParams({})}
          data-testid="cat-all"
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${!category ? "bg-[#1A1A1A] text-[#F4EFE6]" : "bg-white border border-[#EAE3D6] hover:border-[#1A1A1A]"}`}
        >
          {t("common.all")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setParams({ category: c })}
            data-testid={`cat-${c.replace(/ /g, "-")}`}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${category === c ? "bg-[#1A1A1A] text-[#F4EFE6]" : "bg-white border border-[#EAE3D6] hover:border-[#1A1A1A]"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((s) => (
          <Link
            key={s.id}
            to={`/services/${s.id}`}
            data-testid={`service-card-${s.id}`}
            className="card-lift bg-white rounded-3xl overflow-hidden border border-[#EAE3D6]"
          >
            <div className="relative h-64">
              <img src={s.image} alt={nm(s)} className="h-full w-full object-cover" />
              {s.popular && (
                <Badge className="absolute top-4 left-4 bg-[#E07A5F] text-white border-0 font-semibold">Popular</Badge>
              )}
            </div>
            <div className="p-6">
              <div className="text-xs uppercase tracking-widest text-[#E07A5F] font-semibold">{cat(s)}</div>
              <h3 className="font-serif-luxe text-2xl mt-2">{nm(s)}</h3>
              <p className="text-sm text-[#4A4A4A] mt-2 line-clamp-2">{hi && s.description_hi ? s.description_hi : s.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <span className="font-serif-luxe text-2xl">{formatINR(s.price)}</span>
                  <span className="text-xs text-[#4A4A4A] ml-2">· {s.duration_min} {t("common.minutes")}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star size={16} weight="fill" className="text-[#E07A5F]" /> {s.rating || 4.6}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
