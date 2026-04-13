// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    // Vérifier si l'utilisateur est admin (table admins)
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();
      setIsAdmin(!!data);
      setChecking(false);
    };
    checkAdmin();
  }, [user]);

  if (authLoading || checking) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <div className="p-8 text-white text-center">Accès refusé. Vous n'êtes pas administrateur.</div>;
  }

  return <>{children}</>;
}
