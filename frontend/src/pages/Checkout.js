import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Plus, MapPin } from "@phosphor-icons/react";

const SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

export default function Checkout() {
  const { user, refresh } = useAuth();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [slot, setSlot] = useState("14:00");
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    api.get("/cart").then(({ data }) => setCart(data));
    api.get("/addresses").then(({ data }) => {
      setAddresses(data);
      if (data.length > 0) setSelectedAddr(data[0].id);
      else setShowAddAddr(true);
    });
  }, [user]);

  const saveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.pincode || !newAddr.phone) {
      toast.error("Please fill all address fields"); return;
    }
    const { data } = await api.post("/addresses", { ...newAddr, id: crypto.randomUUID() });
    setAddresses((a) => [...a, data]);
    setSelectedAddr(data.id);
    setShowAddAddr(false);
    toast.success("Address saved");
  };

  const pay = async () => {
    if (!selectedAddr) return toast.error("Add an address first");
    setLoading(true);
    try {
      // Save booking intent info in sessionStorage - will finalize on success
      sessionStorage.setItem("dh_pending_booking", JSON.stringify({
        address_id: selectedAddr,
        slot_date: date.toISOString().slice(0, 10),
        slot_time: slot,
      }));
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
        kind: "cart",
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Payment failed");
      setLoading(false);
    }
  };

  if (!user) { navigate("/login"); return null; }
  if (!cart) return <div className="p-16 text-center text-[#4A4A4A]">Loading...</div>;
  if (cart.items.length === 0) { navigate("/services"); return null; }

  const membership = user.membership;
  const activeMember = membership && membership.expires_at && membership.expires_at > new Date().toISOString();
  const discountPct = activeMember ? ({ basic: 10, advanced: 18, premium: 25 }[membership.plan_id] || 0) : 0;
  const discount = cart.total * discountPct / 100;
  const grand = cart.total - discount;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <h1 className="font-serif-luxe text-5xl mb-10">Checkout</h1>
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">

          {/* Address */}
          <section className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-luxe text-2xl">Where should we come?</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddAddr((v) => !v)} data-testid="toggle-add-address-btn">
                <Plus size={14} className="mr-1" /> New address
              </Button>
            </div>
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAddr(a.id)}
                  data-testid={`address-option-${a.id}`}
                  className={`text-left p-4 rounded-xl border transition-colors ${selectedAddr === a.id ? "border-[#1A1A1A] bg-[#F4EFE6]" : "border-[#EAE3D6] hover:border-[#1A1A1A]"}`}
                >
                  <div className="font-serif-luxe text-lg flex items-center gap-2"><MapPin size={16} /> {a.label}</div>
                  <div className="text-sm text-[#4A4A4A] mt-1">{a.line1}, {a.city}, {a.state} {a.pincode}</div>
                  <div className="text-xs text-[#4A4A4A]">{a.phone}</div>
                </button>
              ))}
            </div>

            {showAddAddr && (
              <div className="mt-6 grid md:grid-cols-2 gap-3">
                <div><Label>Label</Label><Input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} data-testid="addr-label-input" /></div>
                <div><Label>Phone</Label><Input value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} data-testid="addr-phone-input" /></div>
                <div className="md:col-span-2"><Label>Address</Label><Input value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} data-testid="addr-line1-input" /></div>
                <div><Label>City</Label><Input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} data-testid="addr-city-input" /></div>
                <div><Label>State</Label><Input value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} data-testid="addr-state-input" /></div>
                <div><Label>Postal code</Label><Input value={newAddr.pincode} onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })} data-testid="addr-pincode-input" /></div>
                <div className="md:col-span-2">
                  <Button onClick={saveAddress} className="btn-primary-ink rounded-full" data-testid="save-address-btn">Save address</Button>
                </div>
              </div>
            )}
          </section>

          {/* Slot */}
          <section className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
            <h2 className="font-serif-luxe text-2xl">Choose your time</h2>
            <div className="mt-5 grid md:grid-cols-2 gap-8">
              <div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                  data-testid="checkout-calendar"
                />
              </div>
              <div>
                <Label>Time slot</Label>
                <Select value={slot} onValueChange={setSlot}>
                  <SelectTrigger className="mt-2" data-testid="slot-select-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => <SelectItem key={s} value={s} data-testid={`slot-${s}`}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl sticky top-28">
            <h3 className="font-serif-luxe text-2xl">Order summary</h3>
            <div className="mt-5 space-y-2 text-sm text-[#4A4A4A]">
              {cart.items.map((it) => (
                <div key={it.service_id} className="flex justify-between">
                  <span>{it.service.name} × {it.quantity}</span>
                  <span>₹{(it.service.price * it.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#EAE3D6] my-4"></div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.total.toLocaleString("en-IN")}</span></div>
              {activeMember && (
                <div className="flex justify-between text-[#8F9779]">
                  <span>{membership.plan_id} member ({discountPct}%)</span>
                  <span>-₹{discount.toLocaleString("en-IN", {maximumFractionDigits: 0})}</span>
                </div>
              )}
            </div>
            <div className="border-t border-[#EAE3D6] my-4"></div>
            <div className="flex justify-between font-serif-luxe text-2xl">
              <span>Total</span>
              <span data-testid="checkout-total">₹{grand.toLocaleString("en-IN", {maximumFractionDigits: 0})}</span>
            </div>
            <Button
              onClick={pay}
              disabled={loading}
              className="btn-primary-ink w-full mt-6 rounded-full h-12"
              data-testid="pay-now-btn"
            >
              {loading ? "Redirecting..." : "Pay & confirm"}
            </Button>
            <p className="text-xs text-[#4A4A4A] mt-3">Secure payment via Stripe. Card 4242 4242 4242 4242 for test.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
