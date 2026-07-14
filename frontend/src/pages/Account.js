import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, MapPin, Trash, Calendar as CalIcon, ArrowsClockwise, X, WarningCircle } from "@phosphor-icons/react";

const SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

export default function Account() {
  const { user, loading, refresh } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "Home", line1: "", city: "", state: "", pincode: "", phone: "" });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reschedTarget, setReschedTarget] = useState(null);
  const [reschedDate, setReschedDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [reschedSlot, setReschedSlot] = useState("14:00");
  const [renewal, setRenewal] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    api.get("/bookings").then(({ data }) => setBookings(data));
    api.get("/addresses").then(({ data }) => setAddresses(data));
    api.get("/memberships/renewal-status").then(({ data }) => setRenewal(data));
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    load();
  }, [user, loading, navigate]);

  const saveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.pincode || !newAddr.phone) return toast.error("Fill all fields");
    const { data } = await api.post("/addresses", { ...newAddr, id: crypto.randomUUID() });
    setAddresses((a) => [...a, data]); setShowAdd(false);
    toast.success("Address added");
  };

  const removeAddr = async (id) => {
    await api.delete(`/addresses/${id}`);
    setAddresses((a) => a.filter((x) => x.id !== id));
  };

  const doCancel = async () => {
    try {
      const { data } = await api.post(`/bookings/${cancelTarget.id}/cancel`);
      toast.success(`Booking cancelled · ${data.refund_pct}% refund ($${data.refund_amount})`);
      setCancelTarget(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Cancel failed"); }
  };

  const doReschedule = async () => {
    try {
      await api.post(`/bookings/${reschedTarget.id}/reschedule`, {
        slot_date: reschedDate.toISOString().slice(0, 10),
        slot_time: reschedSlot,
      });
      toast.success("Booking rescheduled");
      setReschedTarget(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const renewMembership = async () => {
    if (!renewal?.plan_id) return;
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
        kind: "membership",
        plan_id: renewal.plan_id,
      });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error("Could not start renewal"); }
  };

  if (!user) return null;
  const membership = user.membership;
  const activeMember = renewal?.active;

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

      {/* Renewal banner */}
      {renewal?.needs_renewal_prompt && (
        <div className="mb-8 p-5 bg-[#F4EFE6] border border-[#E07A5F]/40 rounded-2xl flex items-center justify-between" data-testid="renewal-banner">
          <div className="flex items-center gap-3">
            <WarningCircle size={22} weight="duotone" className="text-[#E07A5F]" />
            <div>
              <div className="font-serif-luxe text-lg">Your membership expires in {renewal.days_left} day{renewal.days_left === 1 ? "" : "s"}.</div>
              <div className="text-sm text-[#4A4A4A]">Renew now to keep your discount and priority slots.</div>
            </div>
          </div>
          <Button onClick={renewMembership} className="btn-primary-ink rounded-full" data-testid="renew-membership-btn">Renew now</Button>
        </div>
      )}

      <Tabs defaultValue="bookings">
        <TabsList data-testid="account-tabs">
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="addresses" data-testid="tab-addresses">Addresses</TabsTrigger>
          <TabsTrigger value="membership" data-testid="tab-membership">Membership</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-8">
          {bookings.length === 0 && <div className="text-[#4A4A4A]">You have no bookings yet.</div>}
          <div className="space-y-4">
            {bookings.map((b) => {
              const cancellable = ["confirmed", "pending"].includes(b.status);
              return (
                <div key={b.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl" data-testid={`booking-${b.id}`}>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-[#E07A5F]">{b.status}</div>
                      <div className="font-serif-luxe text-xl mt-1">{b.items.map((i) => i.name).join(" · ")}</div>
                      <div className="text-sm text-[#4A4A4A] mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1"><CalIcon size={14} /> {b.slot_date} · {b.slot_time}</span>
                        <span>· {b.address.city}</span>
                      </div>
                      {b.status === "cancelled" && (
                        <div className="text-xs text-[#4A4A4A] mt-2">
                          Refund: {b.refund_pct}% (₹{Number(b.refund_amount || 0).toLocaleString("en-IN")}) · {b.refund_status}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-serif-luxe text-2xl">₹{b.total.toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
                      <div className="text-xs text-[#4A4A4A] mt-1">{b.payment_status}</div>
                    </div>
                  </div>
                  {cancellable && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setReschedTarget(b)} data-testid={`resched-${b.id}`}>
                        <ArrowsClockwise size={14} className="mr-1" /> Reschedule
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCancelTarget(b)} data-testid={`cancel-${b.id}`}>
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
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
              <div className="mt-4 text-sm">Valid until <b>{new Date(membership.expires_at).toLocaleDateString()}</b> · {renewal.days_left} days left</div>
              {renewal.needs_renewal_prompt && (
                <Button onClick={renewMembership} className="mt-4 rounded-full bg-[#F4EFE6] text-[#1A1A1A] hover:bg-white">Renew membership</Button>
              )}
            </div>
          ) : (
            <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
              <p className="text-[#4A4A4A]">You aren't a member yet. Unlock up to 25% off with the DH Circle.</p>
              <Button onClick={() => navigate("/memberships")} className="btn-primary-ink rounded-full mt-4">See plans</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <DialogContent className="bg-white sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif-luxe text-3xl">Cancel booking?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-[#4A4A4A] space-y-3">
            <p><b>Cancellation policy:</b></p>
            <ul className="list-disc ml-5 space-y-1">
              <li>More than 12h before slot → 100% refund</li>
              <li>4–12h before → 50% refund</li>
              <li>Less than 4h → no refund</li>
            </ul>
            <p>Refunds are processed to your card in 5–7 business days.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep booking</Button>
            <Button className="bg-[#E07A5F] hover:bg-[#C56A50] text-white rounded-full" onClick={doCancel} data-testid="confirm-cancel-btn">
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedTarget} onOpenChange={(v) => !v && setReschedTarget(null)}>
        <DialogContent className="bg-white sm:rounded-3xl max-w-lg">
          <DialogHeader><DialogTitle className="font-serif-luxe text-3xl">Reschedule</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <Calendar mode="single" selected={reschedDate} onSelect={(d) => d && setReschedDate(d)}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} className="rounded-md border" />
            <div>
              <Label>New time</Label>
              <Select value={reschedSlot} onValueChange={setReschedSlot}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>{SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-[#4A4A4A] mt-4">Free of charge up to 4 hours before your appointment.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedTarget(null)}>Close</Button>
            <Button className="btn-primary-ink rounded-full" onClick={doReschedule} data-testid="confirm-resched-btn">Confirm reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
