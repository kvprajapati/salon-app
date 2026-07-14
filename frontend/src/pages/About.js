import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkle, Leaf, HandHeart, Star, Quotes } from "@phosphor-icons/react";

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Our story</div>
            <h1 className="font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">
              A <span className="italic text-[#E07A5F]">quieter</span>,<br /> kinder kind of luxury.
            </h1>
            <p className="text-[#4A4A4A] max-w-lg mt-6 leading-relaxed">
              DH Salon began in 2022 as a whisper — the belief that beauty rituals should feel like slow evenings, not
              rushed appointments. Today we bring our specialists to 40+ neighbourhoods, carrying with them the calm of a boutique spa.
            </p>
          </div>
          <div className="lg:col-span-6 grid grid-cols-6 gap-3">
            <img src="https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="" className="col-span-4 row-span-2 rounded-3xl h-[440px] w-full object-cover" />
            <img src="https://images.unsplash.com/photo-1720118509152-2df877673bee?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcGElMjBhZXN0aGV0aWN8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" alt="" className="col-span-2 rounded-3xl h-[212px] w-full object-cover" />
            <img src="https://images.unsplash.com/photo-1613966802194-d46a163af70d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBtYWtldXAlMjBhcnRpc3R8ZW58MHx8fHwxNzg0MDE2MDgzfDA&ixlib=rb-4.1.0&q=85" alt="" className="col-span-2 rounded-3xl h-[212px] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-[#EAE3D6] bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-10">
          {[
            { icon: <Sparkle size={32} weight="duotone" />, t: "Curated rituals", d: "Every service is co-designed with a wellness architect and refined every quarter." },
            { icon: <Leaf size={32} weight="duotone" />, t: "Clean-first products", d: "Only dermatologist-tested, cruelty-free brands touch our members' skin." },
            { icon: <HandHeart size={32} weight="duotone" />, t: "Cared-for specialists", d: "Our team is trained, insured, salaried and shares in the company's success." },
          ].map((v) => (
            <div key={v.t}>
              <div className="text-[#E07A5F] mb-4">{v.icon}</div>
              <div className="font-serif-luxe text-2xl">{v.t}</div>
              <div className="text-[#4A4A4A] text-sm mt-2 leading-relaxed">{v.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { k: "200k+", v: "Happy members" },
          { k: "40+", v: "Cities served" },
          { k: "5,000+", v: "Verified specialists" },
          { k: "4.9", v: "Avg. rating" },
        ].map((s) => (
          <div key={s.k}>
            <div className="font-serif-luxe text-5xl">{s.k}</div>
            <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-2">{s.v}</div>
          </div>
        ))}
      </section>

      {/* Quote */}
      <section className="max-w-4xl mx-auto px-6 lg:px-10 pb-24">
        <div className="p-10 lg:p-14 bg-[#1A1A1A] text-[#F4EFE6] rounded-3xl">
          <Quotes size={30} weight="fill" className="text-[#E07A5F]" />
          <p className="font-serif-luxe text-3xl lg:text-4xl mt-6 leading-snug">
            "The best beauty experience I've had — and I've stopped visiting salons entirely."
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm text-[#DAD3C2]">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} weight="fill" className="text-[#E07A5F]" />)}
            </div>
            <span>— Priya R., Premium member</span>
          </div>
        </div>
      </section>

      <section className="text-center pb-24">
        <Link to="/services"><Button className="btn-primary-ink rounded-full h-12 px-10">Discover the menu</Button></Link>
      </section>
    </div>
  );
}
