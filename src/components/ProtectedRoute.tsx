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
    // Vérifier si l'utilisateur est admin via la table profiles (champ role)
    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data && data.role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
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
