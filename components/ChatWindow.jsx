"use client";

import { useState, useEffect, useRef } from "react";
import socket from "@/lib/socket";
import debounce from "lodash.debounce";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import EmojiPicker from "emoji-picker-react";

import { BsEmojiSmile } from "react-icons/bs";
import { MdOutlineAttachment, MdKeyboardArrowUp } from "react-icons/md";
import { HiEllipsisVertical } from "react-icons/hi2";
import { IoIosAddCircleOutline } from "react-icons/io";
import { MdDeleteOutline } from "react-icons/md";
import toast from "react-hot-toast";
import { FiCamera } from "react-icons/fi";

/* ------------------------------------------------------------------
   MESSAGE BUBBLE COMPONENT
------------------------------------------------------------------ */
function MessageBubble({ m, isMine, searchText }) {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const tick = () => {
    if (m.group_id) return ""; // no ticks for group
    if (!isMine) return "";
    if (m.status === "seen") return "✓✓";
    if (m.status === "delivered") return "✓✓";
    return "✓";
  };

  return (
    <>
      <div
        className={`flex w-full ${
          isMine ? "justify-end" : "justify-start"
        } mb-2`}
      >
        <div
          className={`${
            isMine ? "bg-cyan-600" : "bg-white/10"
          } px-4 py-2 rounded-lg max-w-[70%]`}
        >
          {/* IMAGE MESSAGE */}
          {m.type === "image" && (
            <img
              src={m.url}
              onClick={() => setFullscreenImage(m.url)}
              className="rounded-lg max-w-[250px] max-h-[250px] object-cover mb-2 cursor-pointer hover:opacity-90 transition"
            />
          )}

          {/* FULLSCREEN IMAGE PREVIEW */}
          {fullscreenImage && (
            <div
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              onClick={() => setFullscreenImage(null)}
            >
              <img
                src={fullscreenImage}
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />

              <button
                onClick={() => setFullscreenImage(null)}
                className="absolute top-5 right-5 text-white text-3xl cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TEXT MESSAGE */}
          <p
            className="text-sm break-words"
            dangerouslySetInnerHTML={{
              __html: searchText
                ? m.message.replace(
                    new RegExp(searchText, "gi"),
                    (match) =>
                      `<mark class="bg-yellow-400 text-black">${match}</mark>`
                  )
                : m.message,
            }}
          />

          {/* TIME + TICK */}
          <div className="text-xs text-gray-400 text-right">
            {new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            {tick()}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   MAIN CHAT WINDOW
------------------------------------------------------------------ */
export default function ChatWindow({
  user,
  chat,
  messages,
  typingState,
  onSend,
}) {
  const [text, setText] = useState("");
  const containerRef = useRef();
  const fileInput = useRef();
  const [showEmoji, setShowEmoji] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);
  const [sendingImage, setSendingImage] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const searchRefs = useRef({});

  // GROUP RELATED STATE
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [editedGroupName, setEditedGroupName] = useState(chat?.name || "");

  /* ----------------------------------------------------------
        LOAD MEMBERS WHEN OPENING GROUP INFO
  ---------------------------------------------------------- */
  useEffect(() => {
    if (showGroupInfo && chat?.isGroup) {
      loadGroupMembers();
      api.get("/user/all").then((res) => setAllUsers(res.users || []));
    }
  }, [showGroupInfo]);

  // Load members when chat changes (only for groups)
  useEffect(() => {
    if (chat?.isGroup) {
      loadGroupMembers();
    }
  }, [chat]);

  useEffect(() => {
    if (showGroupInfo && chat?.isGroup) {
      setEditedGroupName(chat.name || ""); // <-- SET INITIAL VALUE HERE
    }
  }, [showGroupInfo, chat]);

  const loadGroupMembers = async () => {
    const res = await api.get(`/group/members/${chat.id}`);
    setMembers(res.members || []);
  };

  /* ----------------------------------------------------------
        SEARCH SYSTEM
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages
      .map((msg, index) => ({
        index,
        match: msg.message?.toLowerCase().includes(searchText.toLowerCase()),
      }))
      .filter((r) => r.match);

    setSearchResults(results);
    setCurrentIndex(0);
  }, [searchText, messages]);

  useEffect(() => {
    if (!searchResults.length) return;
    const msgIndex = searchResults[currentIndex].index;
    const el = searchRefs.current[msgIndex];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex, searchResults]);

  const goNext = () => {
    if (searchResults.length === 0) return;
    setCurrentIndex((p) => (p + 1) % searchResults.length);
  };

  const goPrev = () => {
    if (searchResults.length === 0) return;
    setCurrentIndex((p) => (p - 1 < 0 ? searchResults.length - 1 : p - 1));
  };

  /* ----------------------------------------------------------
        AUTO-SCROLL
  ---------------------------------------------------------- */
  useEffect(() => {
    if (containerRef.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, sendingImage]);

  /* ----------------------------------------------------------
        MARK PERSONAL CHAT MESSAGES SEEN
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!chat || chat.isGroup) return;

    const id = chat.chat_id || chat.id;

    const unseen = messages
      .filter((m) => m.sender_uid !== user.firebase_uid && m.status !== "seen")
      .map((m) => m.id);

    if (unseen.length > 0) {
      socket.emit("messageSeen", {
        chatId: id,
        messageIds: unseen,
        uid: user.firebase_uid,
      });
    }
  }, [messages]);

  /* ----------------------------------------------------------
        TYPING INDICATOR (PERSONAL ONLY)
  ---------------------------------------------------------- */
  const handleTyping = debounce((val) => {
    if (chat.isGroup) return;
    socket.emit("typing", {
      chatId: chat.chat_id || chat.id,
      uid: user.firebase_uid,
      isTyping: val,
    });
  }, 300);

  /* ----------------------------------------------------------
        SEND TEXT / IMAGE
  ---------------------------------------------------------- */
  const sendText = async (e) => {
    e.preventDefault();

    if (previewImage) {
      await confirmSendImage();
      return;
    }

    if (!text.trim()) return;

    await onSend(text.trim());
    setText("");

    if (!chat.isGroup) handleTyping(false);
  };

  const sendFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage({ file, url });
    fileInput.current.value = "";
  };

  const confirmSendImage = async () => {
    const form = new FormData();
    form.append("file", previewImage.file);

    setSendingImage(true);

    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://chatapp-api-omjh.onrender.com/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();

    await onSend("", { type: "image", url: data.url });

    setSendingImage(false);
    setPreviewImage(null);
  };

  if (!chat)
    return <div className="text-center text-gray-400">Select a chat</div>;

  /* ------------------------------------------------------------------
        GROUP FUNCTIONS: ADD, REMOVE, UPDATE AVATAR
  ------------------------------------------------------------------ */

  const uploadGroupAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const token = await auth.currentUser.getIdToken();
    const res = await fetch("https://chatapp-api-omjh.onrender.com/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const data = await res.json();

    await api.post("/group/avatar", {
      group_id: chat.id,
      url: data.url,
    });

    chat.avatar = data.url;
    setShowGroupInfo(true);
  };
  const editGroupName = async () => {
    if (!editedGroupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    try {
      const res = await api.post("/group/rename", {
        group_id: chat.id,
        name: editedGroupName.trim(),
      });

      chat.name = editedGroupName.trim(); // update UI instantly
      toast.success("Group name updated");

      // Force re-render
      setShowGroupInfo(false);
      
      setTimeout(() => setShowGroupInfo(true), 10);
    } catch (err) {
      toast.error("Failed to update group name");
    }
  };

  const addMember = async (uid) => {
    if (!uid) return;

    try {
      await api.post("/group/add-member", {
        group_id: chat.id,
        user_uid: uid,
      });

      loadGroupMembers();
      toast.success("Member added successfully!");
    } catch (err) {
      toast.error("Failed to add member");
    }
  };

  const removeMember = async (uid) => {
    try {
      await api.post("/group/remove-member", {
        group_id: chat.id,
        user_uid: uid,
      });

      loadGroupMembers();
      toast.success("Member removed");
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  function MemberAvatar({ avatar, name }) {
    if (avatar) {
      return (
        <img
          src={avatar}
          className="w-10 h-10 rounded-full object-cover border border-white/20"
        />
      );
    }

    const first = name?.charAt(0)?.toUpperCase() || "?";

    return (
      <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-semibold text-lg">
        {first}
      </div>
    );
  }

  /* ------------------------------------------------------------------
        HEADER AVATAR (PERSONAL / GROUP)
  ------------------------------------------------------------------ */
  function HeaderAvatar({ avatar, name }) {
    if (chat.isGroup) {
      return (
        <img
          src={chat.avatar || "/group.png"}
          className="w-10 h-10 rounded-full object-cover border border-white/20"
        />
      );
    }

    if (avatar)
      return (
        <img src={avatar} className="w-10 h-10 rounded-full object-cover" />
      );

    return (
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
        {name?.charAt(0)?.toUpperCase()}
      </div>
    );
  }

  /* ------------------------------------------------------------------
        RENDER WINDOW
  ------------------------------------------------------------------ */
  return (
    <div className="h-[88.5vh] bg-white/5 flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <HeaderAvatar avatar={chat.avatar} name={chat.name} />

          <div>
            <p className="font-semibold">{chat.name}</p>

            {!chat.isGroup && (
              <p className="text-xs text-gray-300">
                {chat.online
                  ? "Online"
                  : chat.last_active
                  ? "Last active " +
                    new Date(chat.last_active).toLocaleTimeString()
                  : "Offline"}
              </p>
            )}

            {chat.isGroup && (
              <p className="text-xs text-gray-300">{members.length} members</p>
            )}
          </div>
        </div>

        {/* RIGHT ICONS */}
        <div className="flex items-center gap-3">
          {/* SEARCH BOX */}
          {showSearch && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                className="bg-white/10 text-white px-2 py-1 rounded outline-none placeholder-white/60 w-40"
              />

              {searchResults.length > 0 && (
                <span className="text-xs text-white/70">
                  {currentIndex + 1}/{searchResults.length}
                </span>
              )}

              <button
                onClick={goPrev}
                className="text-white/60 text-lg hover:text-white"
              >
                <MdKeyboardArrowUp />
              </button>

              <button
                onClick={goNext}
                className="text-white/60 text-lg hover:text-white"
              >
                <MdKeyboardArrowUp className="rotate-180" />
              </button>
            </div>
          )}

          <HiEllipsisVertical
            size={24}
            onClick={() => setShowSearch(!showSearch)}
            className="text-white/70 cursor-pointer"
          />

          {/* GROUP INFO BUTTON */}
          {chat.isGroup && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="text-white/70 hover:text-white text-sm px-2 py-1"
            >
              Group Info
            </button>
          )}
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto scrollbar-hide"
      >
        {messages.map((m, i) => (
          <div key={m.id} ref={(el) => (searchRefs.current[i] = el)}>
            <MessageBubble
              m={m}
              isMine={m.sender_uid === user.firebase_uid}
              searchText={searchText}
            />
          </div>
        ))}

        {sendingImage && previewImage && (
          <div className="flex w-full justify-end mb-2">
            <div className="relative bg-cyan-600/20 p-2 rounded-lg max-w-[70%]">
              <img
                src={previewImage.url}
                className="w-[180px] max-h-[180px] rounded-md opacity-40 blur-sm"
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <p className="text-white text-xs mt-2">Sending...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TYPING INDICATOR */}
      {!chat.isGroup &&
        typingState.isTyping &&
        typingState.uid !== user.firebase_uid && <TypingBubble />}

      {/* IMAGE PREVIEW */}
      {previewImage && !sendingImage && (
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="relative">
            <img
              src={previewImage.url}
              className="rounded-lg max-w-[200px] max-h-[200px] object-cover"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 bg-red-600 w-6 h-6 flex items-center justify-center rounded-full text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* EMOJI PICKER */}
      {showEmoji && (
        <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)}>
          <div
            className="px-4 py-2 absolute bottom-[95px] left-128"
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              onEmojiClick={(e) => setText((p) => p + e.emoji)}
              theme="dark"
              emojiStyle="apple"
            />
          </div>
        </div>
      )}

      {/* INPUT BOX */}
      <form
        onSubmit={sendText}
        className="p-4 border-t border-white/10 flex gap-3"
      >
        <div className="flex items-center">
          <BsEmojiSmile
            size={22}
            onClick={() => setShowEmoji(!showEmoji)}
            className="text-white/70 cursor-pointer"
          />
        </div>

        <input
          type="file"
          ref={fileInput}
          className="hidden"
          onChange={sendFile}
          accept="image/*"
          id="uploadBtn"
        />

        <label
          htmlFor="uploadBtn"
          className="flex items-center px-1 cursor-pointer"
        >
          <MdOutlineAttachment
            size={23}
            className="-rotate-135 text-white/70"
          />
        </label>

        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!chat.isGroup) handleTyping(!!e.target.value);
          }}
          placeholder="Type a message..."
          className="flex-1 p-3 bg-white/10 rounded-lg outline-none text-white"
        />

        <button className="bg-cyan-600 px-4 rounded-lg cursor-pointer">
          Send
        </button>
      </form>

      {/* GROUP INFO MODAL */}
      {showGroupInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 rounded-lg p-6 w-[420px] text-white">
            <h2 className="text-xl font-semibold mb-4">Group Info</h2>

            {/* GROUP AVATAR */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                <img
                  src={chat.avatar || "/group.png"}
                  className="w-24 h-24 rounded-full object-cover border"
                />

                {/* EDIT ICON */}
                <label className="absolute bottom-0 right-0 bg-white/40 hover:bg-white/50 p-2 rounded-full cursor-pointer shadow-lg transition">
                                 <FiCamera className="text-white text-lg" />
                                 <input
                                   type="file"
                                   accept="image/*"
                                   className="hidden"
                                   onChange={uploadGroupAvatar}
                                 />
                               </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedGroupName || ""}   
                  onChange={(e) => setEditedGroupName(e.target.value)}
                  className="mt-2 bg-white/10 text-white px-3 py-2 rounded-md outline-none w-full text-center"
                />

                <button
                  onClick={editGroupName}
                  className="mt-2 bg-cyan-600 text-xl hover:bg-cyan-700 px-2.5 py-1 rounded-md  cursor-pointer"
                >
                  ✎
                </button>
              </div>
            </div>

            {/* MEMBER LIST */}
            <h3 className="font-semibold">Members</h3>
            <div className="max-h-[200px] overflow-y-auto scrollbar-hide space-y-2 mt-2 ">
              {members.map((m) => (
                <div
                  key={m.user_uid}
                  className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar avatar={m.avatar} name={m.name} />

                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </div>

                  {/* SHOW REMOVE ONLY IF CREATOR */}
                  {m.role !== "creator" &&
                    chat.created_by === user.firebase_uid && (
                      <button
                        onClick={() => removeMember(m.user_uid)}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <MdDeleteOutline size={25} />
                      </button>
                    )}
                </div>
              ))}
            </div>

            {/* ADD MEMBER */}
            {chat.created_by === user.firebase_uid && (
              <>
                <h3 className="font-semibold mt-4 mb-1">Add Members</h3>
                <div className="max-h-[180px] overflow-y-auto scrollbar-hide space-y-2 ">
                  {allUsers
                    .filter(
                      (u) => !members.some((m) => m.user_uid === u.firebase_uid)
                    )
                    .map((u) => (
                      <div
                        key={u.firebase_uid}
                        onClick={() => addMember(u.firebase_uid)}
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 cursor-pointer px-3 py-2 rounded-md"
                      >
                        <MemberAvatar avatar={u.avatar} name={u.name} />

                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>

                        <span className="ml-auto  text-cyan-400 text-sm cursor-pointer">
                          <IoIosAddCircleOutline size={22} />
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* CLOSE */}
            <button
              onClick={() => setShowGroupInfo(false)}
              className="mt-4 w-full py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
     TYPING INDICATOR
------------------------------------------------------------------ */
function TypingBubble() {
  return (
    <div className="px-4 py-2">
      <div className="w-fit bg-white/10 rounded-md px-3 py-2 flex items-center gap-1">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  );
}
