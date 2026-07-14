import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash, ShoppingBag } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Cart() {
  const [cart, setCart] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = () => api.get("/cart").then(({ data }) => setCart(data));
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (sid) => {
    await api.post(`/cart/remove/${sid}`);
    load();
    toast.success("Removed");
  };

  if (!user) return (
    <div className="max-w-3xl mx-auto p-16 text-center">
      <h2 className="font-serif-luxe text-3xl">Sign in to view your bag</h2>
      <Link to="/login"><Button className="btn-primary-ink mt-6 rounded-full h-12 px-8">Sign in</Button></Link>
    </div>
  );

  if (!cart) return <div className="p-16 text-center text-[#4A4A4A]">Loading...</div>;

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-16 text-center">
        <ShoppingBag size={48} weight="duotone" className="mx-auto text-[#E07A5F]" />
        <h2 className="font-serif-luxe text-4xl mt-6">Your bag is empty.</h2>
        <p className="text-[#4A4A4A] mt-3">Explore our menu and add a ritual you'll love.</p>
        <Link to="/services"><Button className="btn-primary-ink mt-8 rounded-full h-12 px-8" data-testid="browse-services-btn">Browse services</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
      <h1 className="font-serif-luxe text-5xl mb-10">Your Bag</h1>
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((it) => (
            <div key={it.service_id} className="flex gap-5 p-4 bg-white border border-[#EAE3D6] rounded-2xl" data-testid={`cart-item-${it.service_id}`}>
              <img src={it.service.image} alt="" className="w-28 h-28 object-cover rounded-xl" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#E07A5F]">{it.service.category}</div>
                  <div className="font-serif-luxe text-xl">{it.service.name}</div>
                  <div className="text-xs text-[#4A4A4A]">{it.service.duration_min} min · Qty {it.quantity}</div>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <div className="font-serif-luxe text-xl">₹{(it.service.price * it.quantity).toLocaleString("en-IN")}</div>
                <button onClick={() => remove(it.service_id)} className="text-[#4A4A4A] hover:text-[#E07A5F]" data-testid={`remove-item-${it.service_id}`}>
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4">
          <div className="p-6 bg-white border border-[#EAE3D6] rounded-2xl sticky top-28">
            <h3 className="font-serif-luxe text-2xl">Order summary</h3>
            <div className="mt-5 space-y-3 text-sm text-[#4A4A4A]">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.total.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Home visit</span><span>Free</span></div>
            </div>
            <div className="border-t border-[#EAE3D6] my-4"></div>
            <div className="flex justify-between font-serif-luxe text-2xl">
              <span>Total</span>
              <span data-testid="cart-total">₹{cart.total.toLocaleString("en-IN")}</span>
            </div>
            <Button onClick={() => navigate("/checkout")} className="btn-primary-ink w-full mt-6 rounded-full h-12" data-testid="proceed-checkout-btn">
              Proceed to checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
