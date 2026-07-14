import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, MapPin, Trash, Calendar } from "@phosphor-icons/react";

export default function Account() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    api.get("/bookings").then(({ data }) => setBookings(data));
    api.get("/addresses").then(({ data }) => setAddresses(data));
  }, [user, navigate]);

  const saveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.pincode || !newAddr.phone) return toast.error("Fill all fields");
    const { data } = await api.post("/addresses", { ...newAddr, id: crypto.randomUUID() });
    setAddresses((a) => [...a, data]);
    setShowAdd(false);
    toast.success("Address added");
  };

  const removeAddr = async (id) => {
    await api.delete(`/addresses/${id}`);
    setAddresses((a) => a.filter((x) => x.id !== id));
  };

  if (!user) return null;
  const membership = user.membership;
  const activeMember = membership && membership.expires_at && membership.expires_at > new Date().toISOString();

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">My account</div>
          <h1 className="font-serif-luxe text-5xl">Hello, {user.name.split(" ")[0]}.</h1>
        </div>
        {activeMember && (
          <div className="px-4 py-2 rounded-full bg-[#1A1A1A] text-[#F4EFE6] flex items-center gap-2 text-sm">
            <Crown size={16} weight="duotone" /> {membership.plan_id.toUpperCase()} member
          </div>
        )}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList data-testid="account-tabs">
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="addresses" data-testid="tab-addresses">Addresses</TabsTrigger>
          <TabsTrigger value="membership" data-testid="tab-membership">Membership</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-8">
          {bookings.length === 0 && <div className="text-[#4A4A4A]">You have no bookings yet.</div>}
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl flex justify-between" data-testid={`booking-${b.id}`}>
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#E07A5F]">{b.status}</div>
                  <div className="font-serif-luxe text-xl mt-1">{b.items.map((i) => i.name).join(" · ")}</div>
                  <div className="text-sm text-[#4A4A4A] mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {b.slot_date} · {b.slot_time}</span>
                    <span>· {b.address.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif-luxe text-2xl">${b.total.toFixed(2)}</div>
                  <div className="text-xs text-[#4A4A4A] mt-1">{b.payment_status}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="mt-8">
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.map((a) => (
              <div key={a.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
                <div className="flex justify-between">
                  <div className="font-serif-luxe text-xl flex items-center gap-2"><MapPin size={16} />{a.label}</div>
                  <button onClick={() => removeAddr(a.id)} className="text-[#4A4A4A] hover:text-[#E07A5F]" data-testid={`del-addr-${a.id}`}><Trash size={16} /></button>
                </div>
                <div className="text-sm text-[#4A4A4A] mt-2">{a.line1}, {a.city}, {a.state} {a.pincode}</div>
                <div className="text-xs text-[#4A4A4A] mt-1">{a.phone}</div>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowAdd((v) => !v)} className="mt-6 rounded-full" data-testid="acct-add-address-btn">+ Add address</Button>
          {showAdd && (
            <div className="mt-6 grid md:grid-cols-2 gap-3 max-w-2xl">
              <div><Label>Label</Label><Input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Address</Label><Input value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} /></div>
              <div><Label>City</Label><Input value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} /></div>
              <div><Label>Postal code</Label><Input value={newAddr.pincode} onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })} /></div>
              <div className="md:col-span-2"><Button onClick={saveAddress} className="btn-primary-ink rounded-full">Save</Button></div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="membership" className="mt-8">
          {activeMember ? (
            <div className="p-6 bg-[#1A1A1A] text-[#F4EFE6] rounded-2xl">
              <div className="flex items-center gap-2"><Crown size={22} weight="duotone" /> <span className="font-serif-luxe text-2xl">{membership.plan_id.toUpperCase()}</span></div>
              <div className="mt-4 text-sm">Valid until <b>{new Date(membership.expires_at).toLocaleDateString()}</b></div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
              <p className="text-[#4A4A4A]">You aren't a member yet. Unlock up to 25% off with the DH Circle.</p>
              <Button onClick={() => navigate("/memberships")} className="btn-primary-ink rounded-full mt-4">See plans</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
