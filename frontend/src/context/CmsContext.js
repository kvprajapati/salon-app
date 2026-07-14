import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const CmsContext = createContext(null);

export function CmsProvider({ children }) {
  const [settings, setSettings] = useState({ brand_name: "DH Salon", tagline: "Beauty · Delivered", logo_url: null });

  const load = () => api.get("/cms/settings").then(({ data }) => setSettings(data)).catch(() => {});

  useEffect(() => { load(); }, []);

  return (
    <CmsContext.Provider value={{ settings, reload: load }}>
      {children}
    </CmsContext.Provider>
  );
}

export const useCms = () => useContext(CmsContext) || { settings: { brand_name: "DH Salon", tagline: "Beauty · Delivered", logo_url: null } };
