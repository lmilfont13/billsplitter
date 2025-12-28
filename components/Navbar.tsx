import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  
  const isLanding = location.pathname === '/';

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="sticky top-0 z-50 w-full bg-background-dark/90 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="size-8 text-primary">
               <Zap className="w-full h-full fill-current" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">BillSplitter</h2>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {!isLanding && (
              <>
                <Link to="/upload" className={`text-sm font-medium transition-colors ${location.pathname === '/upload' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                  Escanear Conta
                </Link>
                <Link to="/history" className={`text-sm font-medium transition-colors ${location.pathname === '/history' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                  Histórico
                </Link>
              </>
            )}
            
            {isLanding ? (
               <div className="flex items-center gap-4">
                 <a href="#" className="text-sm font-medium text-gray-300 hover:text-white">Recursos</a>
                 <a href="#" className="text-sm font-medium text-gray-300 hover:text-white">Como Funciona</a>
                 <Link to="/upload">
                    <button className="bg-primary hover:bg-primary-hover text-background-dark px-5 py-2 rounded-lg text-sm font-bold transition-colors">
                      Entrar
                    </button>
                 </Link>
               </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-bold text-xs">
                        EU
                    </div>
                </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white" onClick={toggleMenu}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background-dark border-b border-white/10 pb-4 px-4 animate-fade-in">
          <nav className="flex flex-col gap-4 mt-4">
            {isLanding ? (
                <>
                    <a href="#" className="text-gray-300 hover:text-white">Recursos</a>
                    <a href="#" className="text-gray-300 hover:text-white">Como Funciona</a>
                    <Link to="/upload" className="text-primary font-bold">Entrar</Link>
                </>
            ) : (
                <>
                    <Link to="/upload" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Escanear Conta</Link>
                    <Link to="/history" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Histórico</Link>
                </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};