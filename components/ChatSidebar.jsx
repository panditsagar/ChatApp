"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import { IoIosAddCircleOutline } from "react-icons/io";
import toast from "react-hot-toast";
import { FiCamera } from "react-icons/fi";

export default function ChatSidebar({ chats, selectedId, onSelect }) {
  const [search, setSearch] = useState("");

  // GROUP LOGIC
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");

  // NEW STATES FOR GROUP PROFILE PIC
  const [groupImage, setGroupImage] = useState(null);
  const [groupImagePreview, setGroupImagePreview] = useState(null);

  // Load all groups + all users
  useEffect(() => {
    api.get("/group/list").then((res) => {
      setGroups(res.groups || []);
    });

    api.get("/user/all").then((res) => {
      setAllUsers(res.users || []);
    });
  }, []);

  // FILTER PERSONAL CHATS
  const filteredChats = chats.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ------------------------------------------------------------------
        UPLOAD GROUP PROFILE PICTURE
  ------------------------------------------------------------------ */
  const onGroupImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGroupImage(file);
    setGroupImagePreview(URL.createObjectURL(file));
  };

  /* ------------------------------------------------------------------
        CREATE GROUP WITH DP SUPPORT
  ------------------------------------------------------------------ */
  const createGroupHandler = async () => {
    if (!groupName.trim()) {
      toast.error("Enter group name");
      return;
    }

    try {
      let avatarUrl = null;

      // Upload group DP first
      if (groupImage) {
        const form = new FormData();
        form.append("file", groupImage);

        const token = await auth.currentUser.getIdToken();

        const uploadRes = await fetch("https://chatapp-api-production-d8c0.up.railway.app/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });

        const uploadData = await uploadRes.json();
        avatarUrl = uploadData.url;
      }

      // Create group
      await api.post("/group/create", {
        name: groupName,
        members: selectedMembers,
        avatar: avatarUrl,
      });

      toast.success("Group created successfully!");

      // Reload
      const g = await api.get("/group/list");
      setGroups(g.groups || []);

      // Reset modal state
      setShowCreateModal(false);
      setGroupName("");
      setSelectedMembers([]);
      setGroupImage(null);
      setGroupImagePreview(null);
    } catch (err) {
      console.log("create group error:", err);
      toast.error("Failed to create group");
    }
  };

  return (
    <div className="bg-white/5 h-full">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-white/10 p-4">
        <h3 className="text-xl font-semibold">Chats</h3>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-white/10 text-white placeholder-gray-400 px-2.5 py-1 rounded-sm outline-none"
        />
      </div>

      {/* SIDEBAR SCROLL AREA */}
      <div className="space-y-3 overflow-y-auto scrollbar-hide h-[calc(100%-40px)] p-4">
        {/* CREATE GROUP BUTTON */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-cyan-600 text-white flex items-center gap-2 justify-center py-2.5 rounded-md hover:bg-cyan-700 transition mb-2 cursor-pointer"
        >
          <span>
            <IoIosAddCircleOutline size={22} />
          </span>{" "}
          Create Group
        </button>

        {/* GROUP LIST */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Groups</h3>

          {groups.length === 0 && (
            <p className="text-gray-400 text-sm">No groups</p>
          )}
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => onSelect({ ...g, isGroup: true }, "group")}
              className="p-3 cursor-pointer flex items-center gap-4 mb-2 rounded-lg bg-white/10 hover:bg-white/20"
            >
              {/* GROUP AVATAR */}
              <img
                src={g.avatar || "/group.png"}
                className="w-12 h-12 rounded-full object-cover border border-white/20"
              />

              <div className="flex-1">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-gray-400">Group chat</p>
              </div>
            </div>
          ))}
        </div>

        {/* PERSONAL CHATS */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Users</h3>

          {filteredChats.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-6">
              No users found
            </p>
          )}

          {filteredChats.map((c) => (
            <div
              key={c.chat_id}
              onClick={() => onSelect(c, c.firebase_uid)}
              className={`p-3 cursor-pointer flex items-center gap-4 mb-2 rounded-lg transition 
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

      {/* CREATE GROUP MODAL */}
      {/* CREATE GROUP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 rounded-xl p-6 w-[420px] max-h-[90vh] overflow-y-auto text-white">
            <h2 className="text-xl font-semibold mb-5 text-center">
              Create Group
            </h2>

            {/* GROUP IMAGE UPLOAD */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                <img
                  src={groupImagePreview || "/group.png"}
                  className="w-24 h-24 rounded-full object-cover border border-white/20"
                />

                <label className="absolute bottom-0 right-0 bg-white/40 hover:bg-white/50 p-2 rounded-full cursor-pointer shadow-lg transition">
                  <FiCamera className="text-white text-lg" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onGroupImageChange}
                  />
                </label>
              </div>
            </div>

            {/* GROUP NAME */}
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white/10 px-3 py-2 rounded-md mb-5 outline-none border border-white/20 focus:border-cyan-500"
            />

            {/* MEMBER LIST */}
            <h3 className="text-lg font-medium mb-2">Add Members</h3>

            <div className="max-h-[250px] overflow-y-auto scrollbar-hide space-y-3">
              {allUsers.map((u) => (
                <div
                  key={u.firebase_uid}
                  onClick={() => {
                    if (selectedMembers.includes(u.firebase_uid)) {
                      setSelectedMembers(
                        selectedMembers.filter((id) => id !== u.firebase_uid)
                      );
                    } else {
                      setSelectedMembers([...selectedMembers, u.firebase_uid]);
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-2  rounded-md"
                >
                  <Avatar avatar={u.avatar} name={u.name} />

                  <div className="flex-1">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u.firebase_uid)}
                    readOnly
                    className="w-5 h-5 "
                  />
                </div>
              ))}
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={createGroupHandler}
                className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700 cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
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
