import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, SignOut, List, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { to: "/services", label: "Services" },
    { to: "/memberships", label: "Memberships" },
    { to: "/about", label: "Our Story" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            <Sparkle size={28} weight="duotone" className="text-[#E07A5F]" />
            <span className="font-serif-luxe text-2xl tracking-tight">DH Salon</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase().replace(/ /g, "-")}`}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors ${isActive ? "text-[#1A1A1A]" : "text-[#4A4A4A] hover:text-[#1A1A1A]"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} data-testid="cart-icon-btn">
              <ShoppingBag size={22} weight="duotone" />
            </Button>
            {user ? (
              <>
                {user.role === "admin" && (
                  <Button variant="outline" onClick={() => navigate("/admin")} data-testid="nav-admin-btn">
                    Admin
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate("/account")} data-testid="nav-account-btn">
                  <User size={18} weight="duotone" className="mr-2" />{user.name.split(" ")[0]}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/"); }} data-testid="logout-btn">
                  <SignOut size={20} />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">Sign in</Button>
                <Button className="btn-primary-ink rounded-full px-6" onClick={() => navigate("/register")} data-testid="nav-signup-btn">
                  Book Now
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} data-testid="cart-icon-btn-mobile">
              <ShoppingBag size={22} weight="duotone" />
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn"><List size={22} /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white">
                <div className="mt-8 flex flex-col gap-6">
                  {nav.map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                      className="text-lg font-serif-luxe" data-testid={`mobile-nav-${n.label.toLowerCase().replace(/ /g, "-")}`}>
                      {n.label}
                    </Link>
                  ))}
                  {user ? (
                    <>
                      <Link to="/account" onClick={() => setMobileOpen(false)} className="text-lg">Account</Link>
                      {user.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-lg">Admin</Link>}
                      <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="text-left text-lg text-[#E07A5F]">Sign out</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)} className="text-lg">Sign in</Link>
                      <Link to="/register" onClick={() => setMobileOpen(false)} className="text-lg text-[#E07A5F]">Book Now</Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#EAE3D6] bg-[#F4EFE6] mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={22} weight="duotone" className="text-[#E07A5F]" />
              <span className="font-serif-luxe text-xl">DH Salon</span>
            </div>
            <p className="text-sm text-[#4A4A4A] leading-relaxed">Premium salon & spa at your doorstep. Experience quiet luxury, one appointment at a time.</p>
          </div>
          <div>
            <div className="eyebrow mb-4">Services</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li><Link to="/services">All Services</Link></li>
              <li><Link to="/services?category=Spa">Spa</Link></li>
              <li><Link to="/services?category=Facial">Facial</Link></li>
              <li><Link to="/services?category=Makeup">Makeup</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">Company</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li><Link to="/memberships">Membership</Link></li>
              <li><Link to="/about">Our Story</Link></li>
              <li><Link to="/account">My Account</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">Contact</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li>hello@dhsalon.com</li>
              <li>+1 (555) 123 8899</li>
              <li>Mon–Sun · 9AM–9PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#EAE3D6]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 text-xs text-[#4A4A4A] flex justify-between">
            <span>© {new Date().getFullYear()} DH Salon. All rights reserved.</span>
            <span>Crafted with care.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
