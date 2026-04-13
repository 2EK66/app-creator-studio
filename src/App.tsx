import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import Podcast from "./pages/Podcast";
import ProtectedRoute from "./components/ProtectedRoute";

// ❌ L'import de AdminPanel manquait ou pointait vers un fichier inexistant
// import AdminPanel from "./pages/AdminPanel"; 

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/marketplace" element={<Marketplace />} />
            
            {/* Route Podcast publique */}
            <Route path="/podcast" element={<Podcast />} />
            
            {/* ✅ MODIFICATION : On commente cette route car AdminPanel fait planter le build */}
            {/* <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            /> 
            */}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
