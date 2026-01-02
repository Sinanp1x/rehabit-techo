import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Check console.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
      
      {/* Animated Logo */}
      <div className="bg-white p-6 rounded-3xl shadow-lg mb-8 animate-bounce-slow">
        <img 
          src="/logo.png" 
          alt="Rehabit Techo Logo" 
          className="w-24 h-24 rounded-2xl"
        />
      </div>
      
      {/* TITLE WITH KANJI */}
      <div className="flex items-baseline gap-3 mb-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Rehabit</h1>
        {/* 'Techo' Kanji in a lighter gray for elegance */}
        <span className="text-3xl font-light text-gray-400">手帳</span> 
      </div>
      
      {/* ATOMIC HABITS SLOGAN */}
      <p className="text-gray-500 mb-12 text-center text-lg font-medium italic">
        "1% Better Every Day"
      </p>

      {/* Button */}
      <button 
        onClick={handleGoogleLogin}
        className="w-full max-w-xs bg-black text-white p-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />
        <span className="font-bold">Open Your Techo</span>
      </button>

      <p className="mt-8 text-xs text-gray-400">v1.0 • Digital Techo</p>
    </div>
  );
};