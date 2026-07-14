import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import api from "@/lib/api";
import { Question } from "@phosphor-icons/react";

export default function FAQ() {
  const [faq, setFaq] = useState([]);
  useEffect(() => { api.get("/faq").then(({ data }) => setFaq(data)); }, []);

  const grouped = faq.reduce((acc, f) => {
    (acc[f.category] ||= []).push(f); return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-14">
      <div className="text-center mb-14">
        <div className="eyebrow mb-3">Support</div>
        <h1 className="font-serif-luxe text-5xl sm:text-6xl">How can we help?</h1>
        <p className="text-[#4A4A4A] mt-4 max-w-xl mx-auto">Everything you need to know about bookings, memberships, cancellations and more.</p>
      </div>

      <div className="space-y-10">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-4">
              <Question size={22} weight="duotone" className="text-[#E07A5F]" />
              <h2 className="font-serif-luxe text-2xl">{cat}</h2>
            </div>
            <Accordion type="single" collapsible className="bg-white border border-[#EAE3D6] rounded-2xl">
              {items.map((f, i) => (
                <AccordionItem key={i} value={`${cat}-${i}`} className="px-5" data-testid={`faq-${cat}-${i}`}>
                  <AccordionTrigger className="font-serif-luxe text-lg text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-[#4A4A4A] leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </div>
  );
}
