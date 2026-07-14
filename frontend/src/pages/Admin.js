import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, CalendarCheck, Wallet, Storefront, Plus, Trash } from "@phosphor-icons/react";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, services: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: "", category: "Facial", description: "", price: 0, duration_min: 60, image: "", popular: false });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") { navigate("/"); return; }
    reload();
  }, [user, loading, navigate]);

  const reload = () => {
    api.get("/admin/stats").then(({ data }) => setStats(data));
    api.get("/admin/users").then(({ data }) => setUsers(data));
    api.get("/admin/bookings").then(({ data }) => setBookings(data));
    api.get("/services").then(({ data }) => setServices(data));
  };

  const addService = async () => {
    try {
      await api.post("/services", { ...form, price: Number(form.price), duration_min: Number(form.duration_min) });
      toast.success("Service added");
      setOpen(false);
      reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
  };

  const delService = async (id) => {
    await api.delete(`/services/${id}`);
    toast.success("Deleted");
    reload();
  };

  if (loading || !user) return <div className="p-16 text-center">Loading...</div>;

  const kpis = [
    { label: "Members", value: stats.users, icon: <Users size={24} weight="duotone" /> },
    { label: "Services", value: stats.services, icon: <Storefront size={24} weight="duotone" /> },
    { label: "Bookings", value: stats.bookings, icon: <CalendarCheck size={24} weight="duotone" /> },
    { label: "Revenue", value: `$${stats.revenue}`, icon: <Wallet size={24} weight="duotone" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="eyebrow mb-2">Admin console</div>
          <h1 className="font-serif-luxe text-5xl">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {kpis.map((k) => (
          <div key={k.label} className="p-5 bg-white border border-[#EAE3D6] rounded-2xl">
            <div className="text-[#E07A5F]">{k.icon}</div>
            <div className="mt-3 font-serif-luxe text-3xl">{k.value}</div>
            <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings" data-testid="admin-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="services" data-testid="admin-tab-services">Services</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr>
                  <th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Slot</th><th className="p-3">Total</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#EAE3D6]" data-testid={`admin-booking-row-${b.id}`}>
                    <td className="p-3">{b.user_name}</td>
                    <td className="p-3">{b.items.map((i) => i.name).join(", ")}</td>
                    <td className="p-3">{b.slot_date} · {b.slot_time}</td>
                    <td className="p-3">${b.total.toFixed(2)}</td>
                    <td className="p-3">{b.status}</td>
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
                  <div><Label>Price ($)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="svc-price-input" /></div>
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
                  <div className="text-sm text-[#4A4A4A]">${s.price} · {s.duration_min} min</div>
                  <button onClick={() => delService(s.id)} className="text-xs text-[#E07A5F] mt-2 inline-flex items-center gap-1" data-testid={`admin-del-svc-${s.id}`}><Trash size={12} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-[#EAE3D6] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F4EFE6] text-left">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Member</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[#EAE3D6]">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">{u.membership?.plan_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
