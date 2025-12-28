import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Zap } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/upload');
  };

  const handleSocialLogin = () => {
    navigate('/upload');
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col lg:flex-row items-center justify-center container mx-auto px-4 py-12 gap-12 lg:gap-24">
      
      {/* Hero Text */}
      <div className="flex-1 text-center lg:text-left space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white">
            Dividir contas <span className="text-primary">nunca</span> foi tão fácil.
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0">
            Escaneie seu recibo, convide amigos e acerte as contas em segundos. Chega de matemática confusa ou dívidas esquecidas.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center lg:justify-start gap-4">
          <Button onClick={() => navigate('/upload')}>Começar Gratuitamente</Button>
          <Button variant="secondary">Ver Demonstração</Button>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-surface-dark border border-white/10 p-8 rounded-2xl shadow-2xl">
        <div className="flex gap-8 mb-8 border-b border-white/10">
          <button className="flex-1 pb-4 border-b-2 border-primary text-white font-bold text-sm">Login</button>
          <button className="flex-1 pb-4 border-b-2 border-transparent text-gray-500 font-bold text-sm hover:text-gray-300">Cadastro</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email</label>
            <input 
              type="email" 
              className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Seu email"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Senha</label>
            <input 
              type="password" 
              className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Sua senha"
            />
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-sm text-gray-400 hover:text-primary transition-colors">Esqueceu a senha?</a>
          </div>

          <Button type="submit" fullWidth>Entrar</Button>
        </form>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-surface-dark text-sm text-gray-500">Ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleSocialLogin}
            className="flex items-center justify-center gap-2 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.618-3.317-11.28-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,36.218,44,30.608,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            <span className="text-sm font-medium text-white">Google</span>
          </button>
           <button 
            onClick={handleSocialLogin}
            className="flex items-center justify-center gap-2 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
           >
            <svg className="w-5 h-5" viewBox="0 0 50 50" fill="white">
              <path d="M 25.996 48 C 26.382 48 26.769 47.992 27.156 47.980 C 36.652 47.691 44.371 40.355 44.945 30.968 C 45.003 30.011 44.332 29.132 43.371 29.066 C 42.414 29.007 41.527 29.675 41.468 30.632 C 40.976 38.867 34.230 45.210 25.996 45.210 C 25.730 45.210 25.460 45.203 25.195 45.187 C 17.515 44.757 11.230 38.480 10.800 30.804 C 10.371 23.125 16.648 16.843 24.324 16.417 C 25.820 16.335 27.300 16.480 28.710 16.839 C 29.582 17.046 30.492 16.582 30.699 15.710 C 30.906 14.839 30.441 13.929 29.570 13.722 C 27.875 13.292 26.105 13.113 24.324 13.199 C 15.113 13.687 7.953 20.843 7.511 30.050 C 7.070 39.261 14.226 46.421 23.437 46.859 C 24.285 46.902 25.136 46.882 25.996 46.882 Z M 35.355 12.871 C 34.664 12.164 33.726 11.789 32.746 11.789 C 32.714 11.789 32.683 11.792 32.652 11.792 C 30.554 11.921 28.796 13.328 28.183 15.335 C 27.570 17.343 28.328 19.511 29.988 20.667 C 30.730 21.191 31.554 21.5 32.417 21.554 C 32.515 21.562 32.613 21.558 32.710 21.554 C 34.843 21.410 36.632 19.957 37.214 17.925 C 37.894 15.589 36.882 13.726 35.355 12.871 M 32.785 2.003 C 31.964 2.046 31.144 2.261 30.378 2.648 C 29.757 2.964 29.421 3.699 29.589 4.394 L 30.765 9.070 C 30.859 9.492 31.144 9.851 31.531 10.035 C 31.917 10.222 32.371 10.218 32.753 10.027 C 33.726 9.558 34.816 9.460 35.867 9.773 C 36.632 9.988 37.472 9.539 37.687 8.769 C 37.898 8.003 37.453 7.164 36.683 6.953 C 35.292 6.558 33.824 6.519 32.417 6.843 L 31.542 3.097 C 31.390 2.484 30.835 2.031 30.203 1.949 C 30.156 1.941 30.105 1.941 30.058 1.945 C 29.914 1.957 29.773 1.945 29.632 1.945 Z"/>
            </svg>
            <span className="text-sm font-medium text-white">Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
};