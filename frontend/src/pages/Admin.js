import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, CalendarCheck, Wallet, Storefront, Plus, Trash,
  UserCircleGear, ReceiptX, Receipt, IdentificationCard, CheckCircle, XCircle
} from "@phosphor-icons/react";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, services: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [pros, setPros] = useState([]);
  const [orders, setOrders] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [form, setForm] = useState({ name: "", category: "Facial", description: "", price: 0, duration_min: 60, image: "", popular: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") { navigate("/"); return; }
    reload();
    api.get("/policy/cancellation").then(({ data }) => setPolicy(data));
  }, [user, loading, navigate]);

  const reload = () => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
    api.get("/admin/users").then(({ data }) => setUsers(data));
    api.get("/admin/bookings").then(({ data }) => setBookings(data));
    api.get("/services").then(({ data }) => setServices(data));
    api.get("/admin/professionals").then(({ data }) => setPros(data));
    api.get("/admin/orders").then(({ data }) => setOrders(data));
  };

  const addService = async () => {
    try {
      await api.post("/services", { ...form, price: Number(form.price), duration_min: Number(form.duration_min) });
      toast.success("Service added"); setOpen(false); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };
  const delService = async (id) => { await api.delete(`/services/${id}`); toast.success("Deleted"); reload(); };
  const setRole = async (uid, role) => {
    await api.put(`/admin/users/${uid}/role`, { role });
    toast.success(`Role set to ${role}`); reload();
  };
  const setProStatus = async (pid, status) => {
    await api.put(`/admin/professionals/${pid}/status?status=${status}`);
    toast.success(`Application ${status}`); reload();
  };
  const setBookingStatus = async (bid, status) => {
    await api.put(`/admin/bookings/${bid}/status?status=${status}`);
    toast.success("Updated"); reload();
  };

  if (loading || !user) return <div className="p-16 text-center">Loading...</div>;

  const pendingPros = pros.filter((p) => p.status === "pending").length;
  const kpis = [
    { label: "Members", value: stats.users, icon: <Users size={22} weight="duotone" /> },
    { label: "Services", value: stats.services, icon: <Storefront size={22} weight="duotone" /> },
    { label: "Bookings", value: stats.bookings, icon: <CalendarCheck size={22} weight="duotone" /> },
    { label: "Revenue", value: `₹${Number(stats.revenue || 0).toLocaleString("en-IN")}`, icon: <Wallet size={22} weight="duotone" /> },
    { label: "Pros pending", value: pendingPros, icon: <IdentificationCard size={22} weight="duotone" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Admin console</div>
          <h1 className="font-serif-luxe text-5xl">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {kpis.map((k) => (
          <div key={k.label} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
            <div className="text-[#E07A5F]">{k.icon}</div>
            <div className="mt-3 font-serif-luxe text-3xl">{k.value}</div>
            <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bookings" data-testid="admin-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="orders" data-testid="admin-tab-orders">Orders & Payments</TabsTrigger>
          <TabsTrigger value="services" data-testid="admin-tab-services">Services</TabsTrigger>
          <TabsTrigger value="professionals" data-testid="admin-tab-pros">
            Professionals {pendingPros > 0 && <Badge className="ml-2 bg-[#E07A5F]">{pendingPros}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users & Roles</TabsTrigger>
          <TabsTrigger value="policy" data-testid="admin-tab-policy">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Slot</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#EAE3D6]" data-testid={`admin-booking-row-${b.id}`}>
                    <td className="p-3">{b.user_name}<div className="text-xs text-[#4A4A4A]">{b.user_email}</div></td>
                    <td className="p-3">{b.items.map((i) => i.name).join(", ")}</td>
                    <td className="p-3">{b.slot_date} · {b.slot_time}</td>
                    <td className="p-3">₹{Number(b.total || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><Badge variant="outline">{b.payment_status}</Badge></td>
                    <td className="p-3">
                      <Select value={b.status} onValueChange={(v) => setBookingStatus(b.id, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs" data-testid={`booking-status-${b.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Session</th><th className="p-3">Kind</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.session_id} className="border-t border-[#EAE3D6]" data-testid={`order-${o.session_id.slice(-8)}`}>
                    <td className="p-3 font-mono text-xs">{o.session_id.slice(0, 22)}…</td>
                    <td className="p-3">{o.kind} {o.plan_id ? `· ${o.plan_id}` : ""}</td>
                    <td className="p-3">₹{Number(o.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      <Badge className={o.payment_status === "paid" ? "bg-[#8F9779] text-white" : "bg-[#F4EFE6] text-[#1A1A1A]"}>
                        {o.payment_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-[#4A4A4A]">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary-ink rounded-full" data-testid="admin-add-service-btn"><Plus size={16} className="mr-1" /> Add service</Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">New service</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="svc-name-input" /></div>
                  <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="svc-price-input" /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                </div>
                <Button onClick={addService} className="btn-primary-ink rounded-full mt-2" data-testid="svc-save-btn">Save</Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <div key={s.id} className="p-4 bg-white border border-[#EAE3D6] rounded-2xl flex gap-4">
                <img src={s.image} alt="" className="w-24 h-24 object-cover rounded-xl" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-widest text-[#E07A5F]">{s.category}</div>
                  <div className="font-serif-luxe text-lg">{s.name}</div>
                  <div className="text-sm text-[#4A4A4A]">₹{Number(s.price).toLocaleString("en-IN")} · {s.duration_min} min</div>
                  <button onClick={() => delService(s.id)} className="text-xs text-[#E07A5F] mt-2 inline-flex items-center gap-1" data-testid={`admin-del-svc-${s.id}`}><Trash size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="professionals" className="mt-6">
          <div className="space-y-3">
            {pros.length === 0 && <div className="text-[#4A4A4A]">No applications yet.</div>}
            {pros.map((p) => (
              <div key={p.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl" data-testid={`pro-row-${p.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#E07A5F]">{p.status}</div>
                    <div className="font-serif-luxe text-xl mt-1">{p.full_name}</div>
                    <div className="text-sm text-[#4A4A4A]">{p.email} · {p.phone} · {p.city}</div>
                    <div className="text-xs text-[#4A4A4A] mt-1">
                      {p.experience_years}y exp · {(p.specializations || []).join(", ")}
                    </div>
                    {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="text-xs underline">Portfolio</a>}
                    {p.about && <p className="text-sm text-[#4A4A4A] mt-2 max-w-2xl">{p.about}</p>}
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setProStatus(p.id, "approved")} className="btn-primary-ink rounded-full" data-testid={`approve-pro-${p.id}`}>
                        <CheckCircle size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setProStatus(p.id, "rejected")} data-testid={`reject-pro-${p.id}`}>
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Member</th><th className="p-3">Role</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[#EAE3D6]">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.membership?.plan_id || "-"}</td>
                    <td className="p-3">
                      <Select value={u.role} onValueChange={(v) => setRole(u.id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs" data-testid={`role-${u.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="policy" className="mt-6">
          <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl max-w-2xl">
            <h3 className="font-serif-luxe text-2xl">Cancellation Policy</h3>
            {policy && (
              <>
                <p className="text-sm text-[#4A4A4A] mt-2">{policy.summary}</p>
                <div className="mt-4 space-y-2 text-sm">
                  {policy.rules.map((r, i) => (
                    <div key={i} className="flex justify-between p-3 bg-[#F4EFE6] rounded-xl">
                      <span>{r.label}</span>
                      <span className="font-mono">{r.refund_pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs text-[#4A4A4A] mt-4">Policies are enforced automatically at cancellation time.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
