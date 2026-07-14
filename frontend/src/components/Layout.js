import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCms } from "@/context/CmsContext";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, User, SignOut, List, Sparkle, InstagramLogo, TiktokLogo, YoutubeLogo,
  FacebookLogo, XLogo, MagnifyingGlass, HeartStraight
} from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DownloadAppButton from "@/components/DownloadAppButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { settings } = useCms();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const brandName = settings?.brand_name || "DH Salon";
  const tagline = settings?.tagline || t("common.tagline");
  const logoUrl = settings?.logo_url;

  const nav = [
    { to: "/services", label: t("common.services") },
    { to: "/memberships", label: t("common.memberships") },
    { to: "/reviews", label: t("common.reviews") },
    { to: "/about", label: t("common.about") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
      {/* Announcement bar */}
      <div className="bg-[#1A1A1A] text-[#F4EFE6] text-xs">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-9 flex items-center justify-between">
          <span className="tracking-widest uppercase opacity-80 hidden sm:inline">{t("common.freeVisit")}</span>
          <span className="tracking-widest uppercase opacity-80 sm:hidden">40+ Cities · 12k+ Reviews</span>
          <div className="flex items-center gap-4 opacity-90">
            <Link to="/register-professional" className="hidden md:inline hover:opacity-100" data-testid="topbar-register-pro-link">
              {t("common.registerPro")}
            </Link>
            <span className="opacity-40 hidden md:inline">·</span>
            <Link to="/careers" className="hidden md:inline hover:opacity-100">{t("common.careers")}</Link>
            <span className="opacity-40 hidden md:inline">·</span>
            <Link to="/faq" className="hidden md:inline hover:opacity-100">{t("common.faq")}</Link>
            <span className="opacity-40 hidden md:inline">·</span>
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <Sparkle size={30} weight="duotone" className="text-[#E07A5F]" />
            )}
            <div className="leading-none">
              <div className="font-serif-luxe text-2xl tracking-tight">{brandName}</div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-[#4A4A4A]">{tagline}</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.to.replace("/", "")}`}
                className={({ isActive }) =>
                  `nav-bold text-sm uppercase tracking-wider transition-colors ${isActive ? "text-[#1A1A1A]" : "text-[#1A1A1A]/85 hover:text-[#E07A5F]"}`
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
            <DownloadAppButton variant="outline" label={t("common.getApp")} className="border-[#1A1A1A] font-semibold" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} data-testid="cart-icon-btn">
              <ShoppingBag size={22} weight="duotone" />
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-semibold" data-testid="user-menu-trigger">
                    <User size={18} weight="duotone" className="mr-2" />{user.name.split(" ")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white w-56">
                  <DropdownMenuLabel className="font-serif-luxe">{t("common.hello")}, {user.name.split(" ")[0]}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/account")} data-testid="menu-account">{t("common.account")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/account")}>{t("common.myBookings")}</DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">{t("common.admin")}</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout" className="text-[#E07A5F]">
                    <SignOut size={16} className="mr-2" /> {t("common.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="font-semibold" data-testid="nav-login-btn">{t("common.signIn")}</Button>
                <Button className="btn-primary-ink rounded-full px-6 font-semibold" onClick={() => navigate("/register")} data-testid="nav-signup-btn">
                  {t("common.bookNow")}
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
                      className="text-xl font-bold" data-testid={`mobile-nav-${n.to.replace("/", "")}`}>
                      {n.label}
                    </Link>
                  ))}
                  <div className="border-t border-[#EAE3D6] pt-4">
                    <Link to="/register-professional" onClick={() => setMobileOpen(false)} className="block text-sm mb-2 font-semibold">{t("common.registerPro")}</Link>
                    <Link to="/careers" onClick={() => setMobileOpen(false)} className="block text-sm mb-2 font-semibold">{t("common.careers")}</Link>
                    <Link to="/faq" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold">{t("common.faq")}</Link>
                  </div>
                  <div className="border-t border-[#EAE3D6] pt-4">
                    {user ? (
                      <>
                        <Link to="/account" onClick={() => setMobileOpen(false)} className="block text-lg mb-2 font-semibold">{t("common.account")}</Link>
                        {user.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-lg mb-2 font-semibold">{t("common.admin")}</Link>}
                        <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="text-left text-lg text-[#E07A5F] font-semibold">{t("common.signOut")}</button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-lg mb-2 font-semibold">{t("common.signIn")}</Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)} className="block text-lg text-[#E07A5F] font-semibold">{t("common.bookNow")}</Link>
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
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded-md object-cover" />
              ) : (
                <Sparkle size={22} weight="duotone" className="text-[#E07A5F]" />
              )}
              <span className="font-serif-luxe text-xl">{brandName}</span>
            </div>
            <p className="text-sm text-[#4A4A4A] leading-relaxed max-w-sm">{t("footer.tagline")}</p>

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
              <DownloadAppButton label={t("common.downloadApp")} className="border-[#1A1A1A]" />
            </div>
          </div>

          <div>
            <div className="eyebrow mb-4">{t("common.explore")}</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A] font-medium">
              <li><Link to="/services">{t("common.services")}</Link></li>
              <li><Link to="/memberships">{t("common.memberships")}</Link></li>
              <li><Link to="/reviews">{t("common.reviews")}</Link></li>
              <li><Link to="/about">{t("common.about")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">{t("common.company")}</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A] font-medium">
              <li><Link to="/careers">{t("common.careers")}</Link></li>
              <li><Link to="/register-professional">{t("common.joinRoster")}</Link></li>
              <li><Link to="/faq">{t("common.faq")}</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-4">{t("common.contact")}</div>
            <ul className="space-y-2 text-sm text-[#4A4A4A] font-medium">
              <li>hello@dhsalon.com</li>
              <li>+91 98765 43210</li>
              <li>Mon–Sun · 9AM–9PM IST</li>
              <li className="flex items-center gap-1 text-[#E07A5F] mt-2"><HeartStraight size={14} weight="fill" /> {t("footer.craftedWithCare")}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#EAE3D6]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 text-xs text-[#4A4A4A] flex flex-wrap justify-between gap-3">
            <span>© {new Date().getFullYear()} DH Salon. {t("footer.rights")}</span>
            <span>{t("footer.policies")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
