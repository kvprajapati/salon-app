import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CmsProvider } from "@/context/CmsContext";
import Layout from "@/components/Layout";
import ChatWidget from "@/components/ChatWidget";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Memberships from "@/pages/Memberships";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Account from "@/pages/Account";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import Admin from "@/pages/Admin";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import Careers from "@/pages/Careers";
import Reviews from "@/pages/Reviews";
import RegisterProfessional from "@/pages/RegisterProfessional";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CmsProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/memberships" element={<Memberships />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/register-professional" element={<RegisterProfessional />} />
                <Route path="/account" element={<Account />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
              </Routes>
            </Layout>
            <ChatWidget />
          </CmsProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
