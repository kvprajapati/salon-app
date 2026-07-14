import { useEffect } from "react";

/**
 * Lightweight SEO hook — sets document.title and meta description/OG tags per page.
 * Avoids extra dependencies; works with react-router route changes.
 */
export default function useSEO({ title, description, image, path }) {
  useEffect(() => {
    const brand = "DH Salon · Beauty at Home in India";
    const fullTitle = title ? `${title} · DH Salon` : brand;
    document.title = fullTitle;

    const set = (name, value, isProp = false) => {
      if (!value) return;
      const attr = isProp ? "property" : "name";
      let el = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    set("description", description || "Book salon, spa, facial, waxing, hair & makeup at home in 40+ Indian cities. Verified specialists, ₹499 memberships, priority slots.");
    set("keywords", "salon at home, spa at home, beauty services India, home salon booking, DH Salon");

    // Open Graph
    set("og:title", fullTitle, true);
    set("og:description", description || "Premium at-home salon & spa in India.", true);
    set("og:type", "website", true);
    set("og:image", image || "https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg", true);

    // Twitter
    set("twitter:card", "summary_large_image");
    set("twitter:title", fullTitle);
    set("twitter:description", description || "Premium at-home salon & spa in India.");
    set("twitter:image", image || "https://images.pexels.com/photos/12115040/pexels-photo-12115040.jpeg");

    // Canonical
    if (path) {
      let canonical = document.head.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", `${window.location.origin}${path}`);
    }
  }, [title, description, image, path]);
}
