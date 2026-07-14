import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Star, ArrowRight, Leaf, Clock, ShieldCheck, HandHeart } from "@phosphor-icons/react";

export default function Home() {
  const [services, setServices] = useState([]);
  useEffect(() => { api.get("/services").then(({ data }) => setServices(data.slice(0, 6))); }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 relative z-10">
            <div className="eyebrow mb-6" data-testid="hero-eyebrow">Salon · Spa · Wellness · At Home</div>
            <h1 className="font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-[#1A1A1A]">
              Quiet luxury.<br />
              <span className="italic text-[#E07A5F]">Delivered</span> to your door.
            </h1>
            <p className="mt-6 text-lg text-[#4A4A4A] max-w-lg leading-relaxed">
              A curated at-home salon experience — trained specialists, sanitised tools, and rituals inspired by the world's most exquisite spas.
            </p>
            <div className="mt-10 flex gap-4">
              <Link to="/services">
                <Button className="btn-primary-ink rounded-full h-12 px-8" data-testid="hero-book-btn">
                  Book a service <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link to="/memberships">
                <Button variant="outline" className="rounded-full h-12 px-8 border-[#1A1A1A]" data-testid="hero-membership-btn">
                  See Memberships
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8 text-sm text-[#4A4A4A]">
              <div className="flex items-center gap-2"><Star size={18} weight="fill" className="text-[#E07A5F]" /> 4.9 · 12k reviews</div>
              <div className="flex items-center gap-2"><ShieldCheck size={18} weight="duotone" /> Verified pros</div>
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
            { icon: <HandHeart size={26} weight="duotone" />, t: "Trained Specialists", d: "Certified beauty therapists" },
            { icon: <Leaf size={26} weight="duotone" />, t: "Clean Products", d: "Non-toxic, dermatologist-tested" },
            { icon: <ShieldCheck size={26} weight="duotone" />, t: "Hygiene First", d: "Sealed & sanitised tools" },
            { icon: <Clock size={26} weight="duotone" />, t: "On-time Arrival", d: "90-day slot precision" },
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
            <div className="eyebrow mb-3">The Menu</div>
            <h2 className="font-serif-luxe text-4xl sm:text-5xl tracking-tight">All your rituals, in one place.</h2>
          </div>
          <Link to="/services" className="hidden sm:inline-flex items-center gap-2 text-sm text-[#1A1A1A] underline underline-offset-4" data-testid="view-all-services-link">
            View all services <ArrowRight size={16} />
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
                <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="text-xs uppercase tracking-widest opacity-80">{s.category}</div>
                  <div className="font-serif-luxe text-2xl mt-1">{s.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm">from ${s.price}</span>
                    <span className="text-sm underline underline-offset-4 opacity-90">Book</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Membership CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="rounded-3xl overflow-hidden relative bg-[#1A1A1A] text-[#F4EFE6] p-10 md:p-16">
          <div className="max-w-2xl">
            <div className="eyebrow text-[#F4EFE6] opacity-70 mb-4">The DH Circle</div>
            <h3 className="font-serif-luxe text-4xl sm:text-5xl">Save on every ritual, forever.</h3>
            <p className="mt-4 text-[#DAD3C2] leading-relaxed">Join our members club and unlock up to 25% off, complimentary treatments, and priority stylists.</p>
            <Link to="/memberships">
              <Button className="mt-8 rounded-full h-12 px-8 bg-[#F4EFE6] text-[#1A1A1A] hover:bg-white" data-testid="cta-memberships-btn">
                Explore memberships <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
