import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Briefcase, MapPin, ArrowRight } from "@phosphor-icons/react";

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => { api.get("/careers").then(({ data }) => setJobs(data)); }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Careers</div>
            <h1 className="font-serif-luxe text-5xl lg:text-6xl leading-[1.05]">Build a quieter kind of beauty.</h1>
            <p className="text-[#4A4A4A] mt-6 max-w-lg leading-relaxed">
              We're a small, obsessive team building the world's most respected at-home salon experience. Come craft it with us.
            </p>
          </div>
          <div className="lg:col-span-6">
            <img className="rounded-3xl h-[380px] w-full object-cover"
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80"
              alt="team" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <h2 className="font-serif-luxe text-3xl mb-8">Open roles</h2>
        <div className="space-y-4">
          {jobs.map((j) => (
            <div key={j.id} className="p-6 bg-white border border-[#EAE3D6] rounded-2xl flex items-center justify-between card-lift" data-testid={`career-${j.id}`}>
              <div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#E07A5F]">
                  <Briefcase size={14} weight="duotone" /> {j.type}
                </div>
                <h3 className="font-serif-luxe text-2xl mt-2">{j.title}</h3>
                <div className="text-sm text-[#4A4A4A] mt-1 flex items-center gap-1"><MapPin size={14} /> {j.location}</div>
                <p className="text-sm text-[#4A4A4A] mt-2 max-w-2xl">{j.description}</p>
              </div>
              <a href={`mailto:careers@dhsalon.com?subject=Applying: ${j.title}`}
                className="hidden md:inline-flex items-center gap-2 text-sm underline underline-offset-4">
                Apply <ArrowRight size={16} />
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
