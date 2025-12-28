import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Upload } from './pages/Upload';
import { Review } from './pages/Review';
import { History } from './pages/History';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-white font-sans">
      <Navbar />
      <main className="flex-grow flex flex-col relative z-0">
          {children}
      </main>
      <footer className="border-t border-white/10 py-8 bg-background-dark mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <div className="flex justify-center gap-6 mb-4">
                <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            </div>
            <p>© 2024 BillSplitter Inc.</p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<string>("Localização desconhecida");

  useEffect(() => {
    // Tentar obter localização via GPS ao iniciar
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Uso simples de API pública para obter nome da cidade (OpenStreetMap Nominatim)
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            
            const city = data.address.city || data.address.town || data.address.village || data.address.municipality;
            const state = data.address.state_district || data.address.state;
            
            if (city) {
              setUserLocation(`${city}${state ? ` - ${state}` : ''}`);
            } else {
              setUserLocation("Brasil (Local exato não encontrado)");
            }
          } catch (error) {
            console.error("Erro ao obter nome da cidade:", error);
            setUserLocation("Brasil");
          }
        },
        (error) => {
          console.warn("Geolocalização negada ou falhou:", error);
          // Fallback: Pedir para o usuário informar se o GPS falhar
          const manualLocation = window.prompt("Não conseguimos acessar seu GPS. Por favor, informe sua cidade atual para o histórico:");
          if (manualLocation) {
            setUserLocation(manualLocation);
          }
        }
      );
    } else {
       const manualLocation = window.prompt("Seu navegador não suporta GPS. Informe sua cidade:");
       if (manualLocation) setUserLocation(manualLocation);
    }
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/review" element={<Review />} />
          <Route path="/history" element={<History userLocation={userLocation} />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;