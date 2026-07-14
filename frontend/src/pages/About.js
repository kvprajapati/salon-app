import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkle, Leaf, HandHeart } from "@phosphor-icons/react";

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14">
      <div className="eyebrow mb-3">Our story</div>
      <h1 className="font-serif-luxe text-5xl sm:text-6xl tracking-tight max-w-3xl">
        A quieter, kinder kind of luxury.
      </h1>
      <p className="text-[#4A4A4A] max-w-2xl mt-6 leading-relaxed">
        DH Salon began as a whisper — the belief that beauty rituals should feel like slow evenings, not
        rushed appointments. Today we bring our specialists to over 40 neighbourhoods, carrying with them
        the calm of a boutique spa.
      </p>

      <div className="mt-14 grid md:grid-cols-2 gap-6">
        <img src="https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="" className="rounded-3xl w-full h-[420px] object-cover" />
        <div className="flex flex-col justify-center gap-6">
          {[
            { icon: <Sparkle size={28} weight="duotone" />, t: "Curated rituals", d: "Every service is designed with a wellness architect." },
            { icon: <Leaf size={28} weight="duotone" />, t: "Clean-first products", d: "Only dermatologist-tested, cruelty-free brands." },
            { icon: <HandHeart size={28} weight="duotone" />, t: "Cared-for specialists", d: "Our team is trained, insured and paid fairly." },
          ].map((v) => (
            <div key={v.t} className="flex gap-4 items-start">
              <div className="text-[#E07A5F]">{v.icon}</div>
              <div>
                <div className="font-serif-luxe text-2xl">{v.t}</div>
                <div className="text-[#4A4A4A] text-sm mt-1">{v.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <Link to="/services"><Button className="btn-primary-ink rounded-full h-12 px-8">Discover the menu</Button></Link>
      </div>
    </div>
  );
}
