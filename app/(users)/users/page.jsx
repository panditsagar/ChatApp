"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FiMessageCircle, FiSearch } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import { BsChatDots } from "react-icons/bs";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get("/user/all");
        setUsers(res.users || []);
      } catch (err) {
        console.log("Load users error:", err);
      }
      setLoading(false);
    };

    loadUsers();
  }, [user]);

  if (loading)
    return (
      <div className="text-center text-white mt-24 text-xl animate-pulse">
        Loading users...
      </div>
    );

  // FILTER
  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-w-md mx-auto mt-20 px-4">
      <h1 className="text-3xl font-semibold text-white mb-6 text-center">
        Select User to Chat
      </h1>

      {/* 🔍 Search Bar */}
      <div className="mb-4 relative">
        <FiSearch className="absolute left-3 top-3 text-gray-300 text-xl" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/10 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>

      {/* USER LIST */}
      <div className="max-h-[65vh] overflow-y-auto space-y-3  scrollbar-hide">
        {filtered.map((u) => (
          <div
            key={u.firebase_uid}
            className="flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <div className="flex items-center gap-4">
              {u.avatar ? (
                <img
                  src={u.avatar}
                  className="w-12 h-12 rounded-full object-cover 0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                  {u.name?.[0]?.toUpperCase()}
                </div>
              )}

              <div>
                <p className="text-white font-medium">{u.name}</p>
                <p className="text-gray-400 text-sm">{u.email}</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/chat/${u.firebase_uid}`)}
              className="flex items-center  gap-2 bg-cyan-600 px-3 py-1.5 rounded-lg cursor-pointer text-white hover:bg-cyan-700"
            >
              <IoChatboxEllipsesOutline size={18} className="mt-1"/>
              Chat
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-300 text-center mt-6 text-sm">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
}
