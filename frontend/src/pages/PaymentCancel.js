import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "@phosphor-icons/react";

export default function PaymentCancel() {
  return (
    <div className="max-w-2xl mx-auto p-16 text-center">
      <XCircle size={72} weight="duotone" className="mx-auto text-[#E07A5F]" />
      <h1 className="font-serif-luxe text-5xl mt-6">Payment cancelled</h1>
      <p className="text-[#4A4A4A] mt-3">Your bag is still saved for you.</p>
      <div className="mt-8 flex gap-4 justify-center">
        <Link to="/cart"><Button className="btn-primary-ink rounded-full h-12 px-8">Back to bag</Button></Link>
        <Link to="/services"><Button variant="outline" className="rounded-full h-12 px-8">Continue browsing</Button></Link>
      </div>
    </div>
  );
}
