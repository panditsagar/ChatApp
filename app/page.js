"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else {
      router.replace("/profile");
    }
  }, [loading, user, router]);

  if (loading) {
    return <p className="text-white">Loading...</p>;
  }

  // IMPORTANT: During redirect don't render anything
  return null;
}
