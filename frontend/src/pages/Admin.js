import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCms } from "@/context/CmsContext";
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
  Users, CalendarCheck, Wallet, Storefront, Plus, Trash, Star,
  IdentificationCard, CheckCircle, XCircle, Image as ImageIcon,
  Article, Ticket, ChatCentered, PaperPlaneTilt, UploadSimple
} from "@phosphor-icons/react";

export default function Admin() {
  const { user, loading } = useAuth();
  const { reload: reloadCms } = useCms();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ users: 0, services: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [pros, setPros] = useState([]);
  const [beauticians, setBeauticians] = useState([]);
  const [orders, setOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [about, setAbout] = useState(null);
  const [settings, setSettings] = useState({});

  const [svcForm, setSvcForm] = useState({ name: "", category: "Facial", description: "", price: 0, duration_min: 60, image: "", popular: false });
  const [svcOpen, setSvcOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ id: "", name: "", price: 0, duration_days: 30, discount_pct: 10, perks: "" });
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") { navigate("/"); return; }
    reload();
  }, [user, loading, navigate]);

  const reload = () => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
    api.get("/admin/users").then(({ data }) => setUsers(data));
    api.get("/admin/customers").then(({ data }) => setCustomers(data));
    api.get("/admin/bookings").then(({ data }) => setBookings(data));
    api.get("/services").then(({ data }) => setServices(data));
    api.get("/admin/professionals").then(({ data }) => setPros(data));
    api.get("/admin/beauticians?status=approved").then(({ data }) => setBeauticians(data));
    api.get("/admin/orders").then(({ data }) => setOrders(data));
    api.get("/memberships/plans").then(({ data }) => setPlans(data));
    api.get("/admin/reviews").then(({ data }) => setReviews(data));
    api.get("/policy/cancellation").then(({ data }) => setPolicy(data));
    api.get("/cms/about").then(({ data }) => setAbout(data));
    api.get("/cms/settings").then(({ data }) => setSettings(data));
  };

  const addService = async () => {
    try {
      await api.post("/services", { ...svcForm, price: Number(svcForm.price), duration_min: Number(svcForm.duration_min) });
      toast.success("Service added"); setSvcOpen(false); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };
  const delService = async (id) => { await api.delete(`/services/${id}`); toast.success("Deleted"); reload(); };

  const savePlan = async () => {
    try {
      const perks = planForm.perks.split("\n").map(p => p.trim()).filter(Boolean);
      await api.post("/admin/plans", {
        id: planForm.id || planForm.name.toLowerCase().replace(/ /g, "-"),
        name: planForm.name, price: Number(planForm.price),
        duration_days: Number(planForm.duration_days),
        discount_pct: Number(planForm.discount_pct),
        perks, is_active: true,
      });
      toast.success("Plan saved"); setPlanOpen(false); reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };
  const delPlan = async (id) => {
    if (!window.confirm("Deactivate this plan?")) return;
    await api.delete(`/admin/plans/${id}`); toast.success("Deactivated"); reload();
  };
  const openPlan = (p) => {
    setPlanForm({
      id: p?.id || "", name: p?.name || "", price: p?.price || 0,
      duration_days: p?.duration_days || 30, discount_pct: p?.discount_pct || 0,
      perks: (p?.perks || []).join("\n"),
    });
    setPlanOpen(true);
  };

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
  const delReview = async (rid) => {
    if (!window.confirm("Delete this review?")) return;
    await api.delete(`/admin/reviews/${rid}`); toast.success("Deleted"); reload();
  };

  const saveAbout = async () => {
    try {
      await api.put("/admin/cms/about", about);
      toast.success("About Us saved"); reload();
    } catch (e) { toast.error("Save failed"); }
  };
  const saveSettings = async () => {
    try {
      await api.put("/admin/cms/settings", { brand_name: settings.brand_name, tagline: settings.tagline });
      toast.success("Settings saved"); reloadCms(); reload();
    } catch (e) { toast.error("Save failed"); }
  };
  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/admin/upload/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Logo uploaded");
      setSettings((s) => ({ ...s, logo_url: data.logo_url }));
      reloadCms();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    }
  };
  const sendRenewalReminders = async () => {
    try {
      const { data } = await api.post("/tasks/send-renewal-reminders");
      toast.success(`Reminder job ran — ${data.sent} sent (or skipped if MSG91/SendGrid not configured)`);
    } catch (e) { toast.error("Failed"); }
  };

  if (loading || !user) return <div className="p-16 text-center">Loading...</div>;

  const pendingPros = pros.filter((p) => p.status === "pending").length;
  const kpis = [
    { label: "Customers", value: customers.length, icon: <Users size={22} weight="duotone" /> },
    { label: "Beauticians", value: beauticians.length, icon: <IdentificationCard size={22} weight="duotone" /> },
    { label: "Services", value: stats.services, icon: <Storefront size={22} weight="duotone" /> },
    { label: "Bookings", value: stats.bookings, icon: <CalendarCheck size={22} weight="duotone" /> },
    { label: "Revenue", value: `₹${Number(stats.revenue || 0).toLocaleString("en-IN")}`, icon: <Wallet size={22} weight="duotone" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Admin console</div>
          <h1 className="font-serif-luxe text-5xl">Dashboard</h1>
        </div>
        <Button onClick={sendRenewalReminders} variant="outline" className="rounded-full" data-testid="run-renewal-job-btn">
          <PaperPlaneTilt size={16} className="mr-2" /> Run renewal reminders
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {kpis.map((k) => (
          <div key={k.label} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
            <div className="text-[#E07A5F]">{k.icon}</div>
            <div className="mt-3 font-serif-luxe text-3xl">{k.value}</div>
            <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-1 font-semibold">{k.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="bookings" data-testid="admin-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="orders" data-testid="admin-tab-orders">Payments</TabsTrigger>
          <TabsTrigger value="services" data-testid="admin-tab-services">Services</TabsTrigger>
          <TabsTrigger value="plans" data-testid="admin-tab-plans">Plans</TabsTrigger>
          <TabsTrigger value="customers" data-testid="admin-tab-customers">Customers</TabsTrigger>
          <TabsTrigger value="beauticians" data-testid="admin-tab-beauticians">
            Beauticians {pendingPros > 0 && <Badge className="ml-2 bg-[#E07A5F]">{pendingPros}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="admin-tab-roles">Roles</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="admin-tab-reviews">Reviews</TabsTrigger>
          <TabsTrigger value="about" data-testid="admin-tab-about">About CMS</TabsTrigger>
          <TabsTrigger value="settings" data-testid="admin-tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="policy" data-testid="admin-tab-policy">Policy</TabsTrigger>
        </TabsList>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Slot</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#EAE3D6]" data-testid={`admin-booking-row-${b.id}`}>
                    <td className="p-3 font-semibold">{b.user_name}<div className="text-xs text-[#4A4A4A] font-normal">{b.user_email}</div></td>
                    <td className="p-3">{b.items.map((i) => i.name).join(", ")}</td>
                    <td className="p-3">{b.slot_date} · {b.slot_time}</td>
                    <td className="p-3">₹{Number(b.total || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3"><Badge variant="outline">{b.payment_status}</Badge></td>
                    <td className="p-3">
                      <Select value={b.status} onValueChange={(v) => setBookingStatus(b.id, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Session</th><th className="p-3">Kind</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.session_id} className="border-t border-[#EAE3D6]">
                    <td className="p-3 font-mono text-xs">{o.session_id.slice(0, 22)}…</td>
                    <td className="p-3 font-semibold">{o.kind} {o.plan_id ? `· ${o.plan_id}` : ""}</td>
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

        {/* SERVICES */}
        <TabsContent value="services" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary-ink rounded-full" data-testid="admin-add-service-btn"><Plus size={16} className="mr-1" /> Add service</Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">New service</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Name</Label><Input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} data-testid="svc-name-input" /></div>
                  <div><Label>Category</Label><Input value={svcForm.category} onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })} /></div>
                  <div><Label>Price (₹)</Label><Input type="number" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} data-testid="svc-price-input" /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={svcForm.duration_min} onChange={(e) => setSvcForm({ ...svcForm, duration_min: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Image URL</Label><Input value={svcForm.image} onChange={(e) => setSvcForm({ ...svcForm, image: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Description</Label><Textarea value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} /></div>
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
                  <div className="text-xs uppercase tracking-widest text-[#E07A5F] font-semibold">{s.category}</div>
                  <div className="font-serif-luxe text-lg">{s.name}</div>
                  <div className="text-sm text-[#4A4A4A]">₹{Number(s.price).toLocaleString("en-IN")} · {s.duration_min} min</div>
                  <button onClick={() => delService(s.id)} className="text-xs text-[#E07A5F] mt-2 inline-flex items-center gap-1"><Trash size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={planOpen} onOpenChange={setPlanOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary-ink rounded-full" onClick={() => openPlan(null)} data-testid="admin-add-plan-btn"><Plus size={16} className="mr-1" /> New plan</Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle className="font-serif-luxe text-2xl">{planForm.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Plan ID</Label><Input value={planForm.id} onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })} placeholder="basic" data-testid="plan-id-input" /></div>
                  <div><Label>Name</Label><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} data-testid="plan-name-input" /></div>
                  <div><Label>Price (₹)</Label><Input type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} data-testid="plan-price-input" /></div>
                  <div><Label>Duration (days)</Label><Input type="number" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} /></div>
                  <div><Label>Discount %</Label><Input type="number" value={planForm.discount_pct} onChange={(e) => setPlanForm({ ...planForm, discount_pct: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Perks (one per line)</Label><Textarea rows={5} value={planForm.perks} onChange={(e) => setPlanForm({ ...planForm, perks: e.target.value })} /></div>
                </div>
                <Button onClick={savePlan} className="btn-primary-ink rounded-full mt-2" data-testid="plan-save-btn">Save plan</Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
                <div className="text-xs uppercase tracking-widest text-[#E07A5F] font-semibold">{p.id}</div>
                <div className="font-serif-luxe text-2xl mt-1">{p.name}</div>
                <div className="text-lg font-semibold">₹{Number(p.price).toLocaleString("en-IN")} <span className="text-xs text-[#4A4A4A] font-normal">/ {p.duration_days} days</span></div>
                <div className="text-xs text-[#4A4A4A] mt-1">{p.discount_pct}% off all services</div>
                <ul className="mt-3 text-sm space-y-1">{(p.perks || []).map((pk, i) => <li key={i} className="text-[#4A4A4A]">• {pk}</li>)}</ul>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPlan(p)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => delPlan(p.id)} className="text-[#E07A5F]">Deactivate</Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* CUSTOMERS */}
        <TabsContent value="customers" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Member</th><th className="p-3">Bookings</th><th className="p-3">Joined</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-[#EAE3D6]" data-testid={`customer-row-${c.id}`}>
                    <td className="p-3 font-semibold">{c.name}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3">{c.phone || "-"}</td>
                    <td className="p-3">{c.membership?.plan_id ? <Badge className="bg-[#1A1A1A] text-[#F4EFE6]">{c.membership.plan_id}</Badge> : <span className="text-[#4A4A4A]">-</span>}</td>
                    <td className="p-3">{c.bookings_count}</td>
                    <td className="p-3 text-xs text-[#4A4A4A]">{c.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* BEAUTICIANS */}
        <TabsContent value="beauticians" className="mt-6">
          <div className="space-y-3">
            {pros.length === 0 && <div className="text-[#4A4A4A]">No applications yet.</div>}
            {pros.map((p) => (
              <div key={p.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl" data-testid={`pro-row-${p.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#E07A5F] font-semibold">{p.status} · {p.category || "—"}</div>
                    <div className="font-serif-luxe text-xl mt-1">{p.full_name}</div>
                    <div className="text-sm text-[#4A4A4A]">{p.email} · {p.phone} · {p.city}</div>
                    <div className="text-xs text-[#4A4A4A] mt-1">{p.experience_years}y exp · {(p.specializations || []).join(", ")}</div>
                    {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="text-xs underline">Portfolio</a>}
                    {p.about && <p className="text-sm text-[#4A4A4A] mt-2 max-w-2xl">{p.about}</p>}
                  </div>
                  <div className="flex gap-2">
                    {p.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => setProStatus(p.id, "approved")} className="btn-primary-ink rounded-full" data-testid={`approve-pro-${p.id}`}><CheckCircle size={14} className="mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => setProStatus(p.id, "rejected")} data-testid={`reject-pro-${p.id}`}><XCircle size={14} className="mr-1" /> Reject</Button>
                      </>
                    )}
                    {p.status !== "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setProStatus(p.id, "pending")}>Re-open</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ROLES */}
        <TabsContent value="roles" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[#EAE3D6]">
                    <td className="p-3 font-semibold">{u.name}</td>
                    <td className="p-3">{u.email}</td>
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

        {/* REVIEWS */}
        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-3">
            {reviews.length === 0 && <div className="text-[#4A4A4A]">No reviews yet.</div>}
            {reviews.map((r) => (
              <div key={r.id} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl" data-testid={`review-row-${r.id}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-[#E07A5F] font-semibold">{r.service_name}</div>
                    <div className="font-serif-luxe text-lg mt-1">{r.user_name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} weight="fill" className="text-[#E07A5F]" />)}
                    </div>
                    <p className="text-sm text-[#4A4A4A] mt-2">{r.comment}</p>
                    <p className="text-xs text-[#4A4A4A] mt-2">{r.created_at?.slice(0, 10)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => delReview(r.id)} className="text-[#E07A5F]" data-testid={`del-review-${r.id}`}>
                    <Trash size={14} className="mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABOUT CMS */}
        <TabsContent value="about" className="mt-6">
          {about && (
            <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl max-w-3xl space-y-4">
              <h3 className="font-serif-luxe text-2xl">About Us content</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Eyebrow</Label><Input value={about.eyebrow} onChange={(e) => setAbout({ ...about, eyebrow: e.target.value })} data-testid="about-eyebrow-input" /></div>
                <div><Label>Hero image URL</Label><Input value={about.hero_image} onChange={(e) => setAbout({ ...about, hero_image: e.target.value })} /></div>
                <div className="col-span-2"><Label>Headline</Label><Input value={about.headline} onChange={(e) => setAbout({ ...about, headline: e.target.value })} data-testid="about-headline-input" /></div>
                <div className="col-span-2"><Label>Sub-headline</Label><Textarea rows={2} value={about.subhead} onChange={(e) => setAbout({ ...about, subhead: e.target.value })} /></div>
                <div className="col-span-2"><Label>Story paragraph</Label><Textarea rows={4} value={about.story} onChange={(e) => setAbout({ ...about, story: e.target.value })} /></div>
              </div>

              <div>
                <Label>3 Values (title + body)</Label>
                {(about.values || []).slice(0, 3).map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-3 mt-2">
                    <Input placeholder="Title" value={v.title || ""} onChange={(e) => {
                      const values = [...about.values];
                      values[i] = { ...values[i], title: e.target.value };
                      setAbout({ ...about, values });
                    }} />
                    <div className="col-span-2">
                      <Input placeholder="Body" value={v.body || ""} onChange={(e) => {
                        const values = [...about.values];
                        values[i] = { ...values[i], body: e.target.value };
                        setAbout({ ...about, values });
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label>4 Stats (value + label)</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {(about.stats || []).slice(0, 4).map((s, i) => (
                    <div key={i} className="space-y-2">
                      <Input placeholder="Value" value={s.value || ""} onChange={(e) => {
                        const stats = [...about.stats];
                        stats[i] = { ...stats[i], value: e.target.value };
                        setAbout({ ...about, stats });
                      }} />
                      <Input placeholder="Label" value={s.label || ""} onChange={(e) => {
                        const stats = [...about.stats];
                        stats[i] = { ...stats[i], label: e.target.value };
                        setAbout({ ...about, stats });
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Featured quote</Label><Textarea rows={2} value={about.quote} onChange={(e) => setAbout({ ...about, quote: e.target.value })} /></div>
                <div className="col-span-2"><Label>Quote author</Label><Input value={about.quote_author} onChange={(e) => setAbout({ ...about, quote_author: e.target.value })} /></div>
              </div>

              <Button onClick={saveAbout} className="btn-primary-ink rounded-full" data-testid="about-save-btn">Save About Us</Button>
            </div>
          )}
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl">
              <h3 className="font-serif-luxe text-2xl">Salon logo</h3>
              <p className="text-sm text-[#4A4A4A] mt-1">Upload a square PNG/JPG under 5 MB. Shows in the header and footer.</p>
              <div className="mt-6 flex items-center gap-6">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-24 w-24 object-cover rounded-2xl border border-[#EAE3D6]" data-testid="admin-logo-preview" />
                ) : (
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-[#EAE3D6] flex items-center justify-center text-[#4A4A4A]">
                    <ImageIcon size={30} weight="duotone" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} data-testid="logo-file-input" />
                  <div className="btn-primary-ink rounded-full px-6 h-11 inline-flex items-center gap-2 font-semibold">
                    <UploadSimple size={16} /> Upload logo
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl space-y-3">
              <h3 className="font-serif-luxe text-2xl">Brand identity</h3>
              <div><Label>Brand name</Label><Input value={settings.brand_name || ""} onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })} data-testid="brand-name-input" /></div>
              <div><Label>Tagline</Label><Input value={settings.tagline || ""} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} data-testid="tagline-input" /></div>
              <Button onClick={saveSettings} className="btn-primary-ink rounded-full mt-2" data-testid="settings-save-btn">Save brand</Button>
            </div>
          </div>
        </TabsContent>

        {/* POLICY */}
        <TabsContent value="policy" className="mt-6">
          <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl max-w-2xl">
            <h3 className="font-serif-luxe text-2xl">Cancellation policy</h3>
            {policy && (
              <>
                <p className="text-sm text-[#4A4A4A] mt-2">{policy.summary}</p>
                <div className="mt-4 space-y-2 text-sm">
                  {policy.rules.map((r, i) => (
                    <div key={i} className="flex justify-between p-3 bg-[#F4EFE6] rounded-xl">
                      <span>{r.label}</span><span className="font-mono font-semibold">{r.refund_pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
