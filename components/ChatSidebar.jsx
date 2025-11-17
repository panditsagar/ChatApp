"use client";

import { useState } from "react";

export default function ChatSidebar({ chats, selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  // 🟦 FILTER ONLY BY NAME
  const filteredChats = chats.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white/5  h-full">
      {/* FIX: Header always visible */}
      <div className="flex items-center  gap-4 border-b border-white/10 p-4 ">
        <h3 className="text-xl font-semibold">Chats</h3>
        <div className=" ">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-white/10 text-white placeholder-gray-400  px-2.5 py-1 rounded-sm outline-none"
          />
        </div>
      </div>

      {/* FIX: Only this part scrolls */}
      <div className="space-y-1 overflow-y-auto scrollbar-hide h-[calc(100%-40px)] p-4">
        {filteredChats.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            No users found
          </p>
        )}

        {filteredChats.map((c) => (
          <div
            key={c.chat_id}
            onClick={() => onSelect(c, c.firebase_uid)}
            className={`p-3 cursor-pointer flex items-center gap-4 rounded-lg transition 
              ${
                selectedId == c.chat_id || selectedId == c.id
                  ? "bg-white/20"
                  : "bg-white/10"
              } 
              hover:bg-white/20`}
          >
            <Avatar avatar={c.avatar} name={c.name} />

            <div className="flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-gray-300 truncate">
                {c.last_message || "Tap to chat"}
              </p>
              <p className="text-[10px] text-gray-400">
                {c.last_message_at
                  ? new Date(c.last_message_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>

            {c.unread > 0 && (
              <span className="bg-red-600 text-xs px-2 py-0.5 rounded-full">
                {c.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ avatar, name }) {
  if (avatar)
    return <img src={avatar} className="w-12 h-12 rounded-full object-cover" />;

  const first = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="w-12 h-12 rounded-full border flex items-center justify-center text-white text-xl font-bold">
      {first}
    </div>
  );
}
