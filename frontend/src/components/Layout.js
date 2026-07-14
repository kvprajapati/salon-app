import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, User, SignOut, List, Sparkle, InstagramLogo, TiktokLogo, YoutubeLogo,
  FacebookLogo, XLogo, MagnifyingGlass, HeartStraight
} from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DownloadAppButton from "@/components/DownloadAppButton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { to: "/services", label: "Services" },
    { to: "/memberships", label: "Memberships" },
    { to: "/reviews", label: "Reviews" },
    { to: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
      {/* Announcement bar */}
      <div className="bg-[#1A1A1A] text-[#F4EFE6] text-xs">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-9 flex items-center justify-between">
          <span className="tracking-widest uppercase opacity-80">Complimentary at-home visit · 40+ cities · 12k+ 5-star reviews</span>
          <div className="hidden md:flex items-center gap-4 opacity-90">
            <Link to="/register-professional" className="hover:opacity-100" data-testid="topbar-register-pro-link">Register as a Professional</Link>
            <span className="opacity-40">·</span>
            <Link to="/careers" className="hover:opacity-100">Careers</Link>
            <span className="opacity-40">·</span>
            <Link to="/faq" className="hover:opacity-100">Help</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            <Sparkle size={30} weight="duotone" className="text-[#E07A5F]" />
            <div className="leading-none">
              <div className="font-serif-luxe text-2xl tracking-tight">DH Salon</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-[#4A4A4A]">Beauty · Delivered</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
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

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/services")} data-testid="search-btn">
              <MagnifyingGlass size={20} weight="regular" />
            </Button>
            <DownloadAppButton variant="outline" label="Get the app" className="border-[#1A1A1A]" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} data-testid="cart-icon-btn">
              <ShoppingBag size={22} weight="duotone" />
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" data-testid="user-menu-trigger">
                    <User size={18} weight="duotone" className="mr-2" />{user.name.split(" ")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white w-56">
                  <DropdownMenuLabel className="font-serif-luxe">Hello, {user.name.split(" ")[0]}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/account")} data-testid="menu-account">My account</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/account?tab=bookings")}>My bookings</DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">Admin console</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout" className="text-[#E07A5F]">
                    <SignOut size={16} className="mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <div className="mt-8 flex flex-col gap-5">
                  {nav.map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                      className="text-xl font-serif-luxe" data-testid={`mobile-nav-${n.label.toLowerCase()}`}>
                      {n.label}
                    </Link>
                  ))}
                  <div className="border-t border-[#EAE3D6] pt-4">
                    <Link to="/register-professional" onClick={() => setMobileOpen(false)} className="block text-sm mb-2">Register as a Professional</Link>
                    <Link to="/careers" onClick={() => setMobileOpen(false)} className="block text-sm mb-2">Careers</Link>
                    <Link to="/faq" onClick={() => setMobileOpen(false)} className="block text-sm">Help & FAQ</Link>
                  </div>
                  <div className="border-t border-[#EAE3D6] pt-4">
                    {user ? (
                      <>
                        <Link to="/account" onClick={() => setMobileOpen(false)} className="block text-lg mb-2">Account</Link>
                        {user.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-lg mb-2">Admin</Link>}
                        <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="text-left text-lg text-[#E07A5F]">Sign out</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-lg mb-2">Sign in</Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)} className="block text-lg text-[#E07A5F]">Book Now</Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#EAE3D6] bg-[#F4EFE6] mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkle size={22} weight="duotone" className="text-[#E07A5F]" />
              <span className="font-serif-luxe text-xl">DH Salon</span>
            </div>
            <p className="text-sm text-[#4A4A4A] leading-relaxed max-w-sm">Premium salon & spa at your doorstep. Experience quiet luxury, one appointment at a time.</p>

            <div className="mt-6 flex items-center gap-3">
              {[
                { icon: <InstagramLogo size={18} weight="duotone" />, href: "https://instagram.com" },
                { icon: <TiktokLogo size={18} weight="duotone" />, href: "https://tiktok.com" },
                { icon: <YoutubeLogo size={18} weight="duotone" />, href: "https://youtube.com" },
                { icon: <FacebookLogo size={18} weight="duotone" />, href: "https://facebook.com" },
                { icon: <XLogo size={18} weight="duotone" />, href: "https://x.com" },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noreferrer"
                  data-testid={`social-${i}`}
                  className="h-9 w-9 rounded-full bg-white border border-[#EAE3D6] hover:bg-[#1A1A1A] hover:text-[#F4EFE6] flex items-center justify-center transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="mt-6">
              <DownloadAppButton label="Get the DH app" className="border-[#1A1A1A]" />
            </div>
          </div>

          <div>
            <div className="eyebrow mb-4">Explore</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li><Link to="/services">All Services</Link></li>
              <li><Link to="/memberships">Memberships</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">Company</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/register-professional">Join as a Professional</Link></li>
              <li><Link to="/faq">Help & FAQ</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">Contact</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A]">
              <li>hello@dhsalon.com</li>
              <li>+1 (555) 123 8899</li>
              <li>Mon–Sun · 9AM–9PM</li>
              <li className="flex items-center gap-1 text-[#E07A5F] mt-2"><HeartStraight size={14} weight="fill" /> Crafted with care</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#EAE3D6]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 text-xs text-[#4A4A4A] flex flex-wrap justify-between gap-3">
            <span>© {new Date().getFullYear()} DH Salon. All rights reserved.</span>
            <span>Cancellation policy · Privacy · Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
