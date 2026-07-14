import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [state, setState] = useState({ status: "polling", payment_status: "pending" });
  const [booking, setBooking] = useState(null);
  const attempts = useRef(0);
  const { refresh } = useAuth();

  useEffect(() => {
    if (!sid) return;
    let alive = true;
    let interval = setInterval(async () => {
      attempts.current += 1;
      if (attempts.current > 20) { clearInterval(interval); return; }
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (!alive) return;
        setState(data);
        if (data.payment_status === "paid") {
          clearInterval(interval);
          const pending = sessionStorage.getItem("dh_pending_booking");
          if (pending) {
            const info = JSON.parse(pending);
            try {
              const { data: b } = await api.post("/bookings", { ...info, payment_session_id: sid });
              setBooking(b);
              sessionStorage.removeItem("dh_pending_booking");
            } catch (e) {}
          }
          await refresh();
        }
      } catch (e) {}
    }, 2000);
    return () => { alive = false; clearInterval(interval); };
  }, [sid, refresh]);

  const paid = state.payment_status === "paid";

  return (
    <div className="max-w-2xl mx-auto p-16 text-center">
      {paid ? (
        <>
          <CheckCircle size={72} weight="duotone" className="mx-auto text-[#8F9779]" />
          <h1 className="font-serif-luxe text-5xl mt-6" data-testid="payment-success-heading">You're all set.</h1>
          <p className="text-[#4A4A4A] mt-3">A confirmation has been added to your account.</p>
          {booking && (
            <div className="mt-8 text-left p-6 bg-white border border-[#EAE3D6] rounded-2xl">
              <div className="eyebrow mb-2">Booking confirmed</div>
              <div className="font-serif-luxe text-2xl">{booking.items.map((i) => i.name).join(" · ")}</div>
              <div className="text-sm text-[#4A4A4A] mt-2">{booking.slot_date} at {booking.slot_time} · {booking.address.city}</div>
            </div>
          )}
          <div className="mt-8 flex gap-4 justify-center">
            <Link to="/account"><Button className="btn-primary-ink rounded-full h-12 px-8" data-testid="view-bookings-btn">View my bookings</Button></Link>
            <Link to="/services"><Button variant="outline" className="rounded-full h-12 px-8">Book another ritual</Button></Link>
          </div>
        </>
      ) : (
        <>
          <Sparkle size={72} weight="duotone" className="mx-auto text-[#E07A5F] animate-pulse" />
          <h1 className="font-serif-luxe text-4xl mt-6">Confirming your payment...</h1>
          <p className="text-[#4A4A4A] mt-2">This usually takes just a moment.</p>
        </>
      )}
    </div>
  );
}
