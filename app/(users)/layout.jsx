"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { FiLogOut, FiUser, FiUsers } from "react-icons/fi";
import { MdOutlineEmail } from "react-icons/md";
import toast from "react-hot-toast";
import { HiOutlineMail } from "react-icons/hi";

export default function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Logged out successfully!"); // <-- SHOW TOAST
      router.replace("/login"); // <-- GO TO LOGIN
    } catch (error) {
      console.log(error);
      toast.error("Failed to logout. Try again!");
    }
  };

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen text-white">
      <div className="w-full flex justify-between items-center fixed top-0 left-0 px-6 py-4 z-50 shadow-lg">
        <h1 className="text-2xl font-semibold">
          <span className="text-cyan-400">{user?.name}</span>
        </h1>

        <nav className="flex gap-10 text-gray-200 text-lg">
          <Link
            href="/profile"
            className="flex items-center gap-1 hover:text-cyan-400 transition"
          >
            <FiUser /> Profile
          </Link>
          <Link
            href="/users"
            className="flex items-center gap-1 hover:text-cyan-400 transition"
          >
            <FiUsers /> Users
          </Link>

          <Link
            href="#"
            className="flex items-center gap-1 hover:text-cyan-400 transition"
          >
            <HiOutlineMail size={22} /> 
          </Link>
        </nav>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-5 py-2 rounded-lg hover:bg-red-600 transition cursor-pointer flex items-center gap-2"
        >
          <FiLogOut />
          Logout
        </button>
      </div>

      {/* MAIN CONTENT - FIXED */}
      <main>{children}</main>
    </div>
  );
}
