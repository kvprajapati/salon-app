import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkle, Leaf, HandHeart, Star, Quotes } from "@phosphor-icons/react";
import useSEO from "@/hooks/useSEO";

const ICONS = [<Sparkle size={32} weight="duotone" />, <Leaf size={32} weight="duotone" />, <HandHeart size={32} weight="duotone" />];

export default function About() {
  const [cms, setCms] = useState(null);
  useEffect(() => { api.get("/cms/about").then(({ data }) => setCms(data)); }, []);
  useSEO({ title: "About Us", description: cms?.subhead, image: cms?.hero_image, path: "/about" });

  if (!cms) return <div className="p-16 text-center text-[#4A4A4A]">Loading...</div>;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">{cms.eyebrow}</div>
            <h1 className="font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[1.05]" data-testid="about-headline">
              {cms.headline}
            </h1>
            <p className="text-[#4A4A4A] max-w-lg mt-6 leading-relaxed">{cms.subhead}</p>
            <p className="text-[#4A4A4A] max-w-lg mt-4 leading-relaxed text-sm">{cms.story}</p>
          </div>
          <div className="lg:col-span-6">
            <img src={cms.hero_image} alt="" className="rounded-3xl h-[440px] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-[#EAE3D6] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-10">
          {cms.values.map((v, i) => (
            <div key={i}>
              <div className="text-[#E07A5F] mb-4">{ICONS[i % ICONS.length]}</div>
              <div className="font-serif-luxe text-2xl">{v.title}</div>
              <div className="text-[#4A4A4A] text-sm mt-2 leading-relaxed">{v.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {cms.stats.map((s, i) => (
          <div key={i}>
            <div className="font-serif-luxe text-5xl">{s.value}</div>
            <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-2 font-semibold">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Quote */}
      <section className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
        <div className="p-10 lg:p-14 bg-[#1A1A1A] text-[#F4EFE6] rounded-3xl">
          <Quotes size={30} weight="fill" className="text-[#E07A5F]" />
          <p className="font-serif-luxe text-3xl lg:text-4xl mt-6 leading-snug">"{cms.quote}"</p>
          <div className="mt-6 flex items-center gap-4 text-sm text-[#DAD3C2]">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />)}
            </div>
            <span>— {cms.quote_author}</span>
          </div>
        </div>
      </section>

      <section className="text-center pb-24">
        <Link to="/services"><Button className="btn-primary-ink rounded-full h-12 px-10 font-semibold">Discover the menu</Button></Link>
      </section>
    </div>
  );
}
