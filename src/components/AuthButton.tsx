"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-400 hidden sm:block">
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="text-xs font-medium text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/login")}
      className="text-xs font-medium text-black bg-[#e8530e] hover:bg-[#ff6a20] px-4 py-2 rounded-lg transition-colors border border-transparent shadow-[0_0_15px_rgba(232,83,14,0.3)] hover:shadow-[0_0_20px_rgba(232,83,14,0.5)]"
    >
      Sign In / Sign Up
    </button>
  );
}
