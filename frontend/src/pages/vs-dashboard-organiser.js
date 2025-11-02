import React, { useRef } from "react";
import EnhancedChatBox from "../components/vs-chatbot-enhanced";
import { logoutUser } from "../utils/auth";
import venueLogo from "../venue.svg";

export default function DashboardAdmin() {
  const logout = () => logoutUser();
  const resetToHomeRef = useRef(null);

  const handleLogoClick = () => {
    if (resetToHomeRef.current) {
      resetToHomeRef.current();
    }
  };

  return (
    <div className="h-screen relative overflow-hidden bg-black">
      {/* Header - Dark with gradient outline */}
      <header className="sticky top-0 z-30 dark-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <img 
              src={venueLogo} 
              alt="Venue Logo" 
              className="h-7 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={handleLogoClick}
            />
          </div>
          <button
            onClick={logout}
            className="px-6 py-2.5 text-sm font-medium text-white gradient-outline-button rounded-lg transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full h-full overflow-hidden">
        <EnhancedChatBox 
          role="Admin" 
          onResetReady={(resetFn) => {
            resetToHomeRef.current = resetFn;
          }}
        />
      </main>
    </div>
  );
}
