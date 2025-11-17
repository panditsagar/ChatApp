"use client";

import { useEffect, useRef, useState } from "react";
import socket from "@/lib/socket";
import api from "@/lib/api";
import debounce from "lodash.debounce";
import { auth } from "@/lib/firebase";
import { BsEmojiSmile } from "react-icons/bs";
import { MdOutlineAttachment } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";
import { MdKeyboardArrowUp } from "react-icons/md";
import { HiEllipsisVertical } from "react-icons/hi2";

/* ------------------ MESSAGE BUBBLE ------------------ */
function MessageBubble({ m, isMine, searchText }) {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const tick = () => {
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
          {m.type === "image" && m.url && (
            <img
              src={m.url}
              onClick={() => setFullscreenImage(m.url)}
              className="rounded-lg max-w-[250px] max-h-[250px] object-cover mb-2 cursor-pointer hover:opacity-90 transition"
            />
          )}

          {/* FULLSCREEN VIEW */}
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

          {/* TEXT */}
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
          ></p>

          {/* TIME + STATUS */}
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

/* ------------------ MAIN CHAT WINDOW ------------------ */
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

  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      setCurrentIndex(0);
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
    if (searchResults.length === 0) return;

    const msgIndex = searchResults[currentIndex].index;
    const element = searchRefs.current[msgIndex];
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, searchResults]);

  const goNext = () => {
    if (searchResults.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % searchResults.length);
  };

  const goPrev = () => {
    if (searchResults.length === 0) return;
    setCurrentIndex((prev) =>
      prev - 1 < 0 ? searchResults.length - 1 : prev - 1
    );
  };

  useEffect(() => {
    if (containerRef.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, sendingImage]);

  // MARK SEEN
  useEffect(() => {
    if (!chat) return;

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

  const onEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;

    // ALWAYS insert emoji in text input
    setText((prev) => prev + emoji);

    // Do NOT auto-send
  };

  const handleTyping = debounce((val) => {
    socket.emit("typing", {
      chatId: chat.chat_id || chat.id,
      uid: user.firebase_uid,
      isTyping: val,
    });
  }, 300);

  const sendText = async (e) => {
    e.preventDefault();

    // IMAGE SEND
    if (previewImage) {
      await confirmSendImage();
      return;
    }

    if (!text.trim()) return;
    await onSend(text.trim());
    setText("");
    handleTyping(false);
  };

  const sendFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage({ file, url });

    fileInput.current.value = "";
  };

  const confirmSendImage = async () => {
    if (!previewImage) return;

    setSendingImage(true);

    const form = new FormData();
    form.append("file", previewImage.file);
    const token = await auth.currentUser.getIdToken();

    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      const imageUrl = data.url;

      await onSend("", { type: "image", url: imageUrl });
    } catch (err) {
      console.log("Image upload error:", err);
    }

    setSendingImage(false);
    setPreviewImage(null);
  };

  if (!chat)
    return <div className="text-center text-gray-400">Select a chat</div>;

  return (
    <div className="h-[88.5vh] bg-white/5 flex flex-col">
      {/* HEADER */}
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <HeaderAvatar avatar={chat.avatar} name={chat.name} />

          <div>
            <p className="font-semibold">{chat.name}</p>
            <p className="text-xs text-gray-300">
              {chat.online
                ? "Online"
                : chat.last_active
                ? "Last active " +
                  new Date(chat.last_active).toLocaleTimeString()
                : "Offline"}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE ICONS */}
        <div className="flex items-center ">
          {/* SEARCH BOX (toggle) */}
          {showSearch && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search..."
                className="bg-white/10 text-white px-2 py-1 rounded outline-none placeholder-white/60 w-40"
              />

              {/* COUNT */}
              {searchResults.length > 0 && (
                <span className="text-xs text-white/70">
                  {currentIndex + 1}/{searchResults.length}
                </span>
              )}

              {/* ARROWS */}
              <button
                onClick={goPrev}
                className="text-white/60 text-lg  hover:text-white "
              >
                <MdKeyboardArrowUp />
              </button>
              <button
                onClick={goNext}
                className="text-white/60 text-lg  hover:text-white px-0"
              >
                <MdKeyboardArrowUp className="rotate-180" />
              </button>
            </div>
          )}

          <HiEllipsisVertical
            size={24}
            onClick={() => setShowSearch((prev) => !prev)}
            className="text-white/70 cursor-pointer"
          />
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

        {/* --------- IMAGE SENDING BUBBLE --------- */}
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

      {/* TYPING */}
      {typingState.isTyping && typingState.uid !== user.firebase_uid && (
        <TypingBubble />
      )}

      {/* IMAGE PREVIEW ABOVE INPUT */}
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
      {/* EMOJI PICKER WITH TAP-OUTSIDE-TO-CLOSE — SAME POSITION & STYLE */}
      {showEmoji && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmoji(false)} // close when clicking outside
        >
          <div
            className="px-4 py-2 absolute bottom-[95px] left-128"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <EmojiPicker
              onEmojiClick={onEmojiSelect}
              theme="dark"
              emojiStyle="apple"
            />
          </div>
        </div>
      )}

      {/* INPUT */}
      <form
        onSubmit={sendText}
        className="p-4 border-t border-white/10 flex gap-3"
      >
        <div className="flex items-center">
          <BsEmojiSmile
            onClick={() => setShowEmoji((prev) => !prev)}
            size={22}
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
            handleTyping(!!e.target.value);
          }}
          placeholder="Type a message..."
          className="flex-1 p-3 bg-white/10 rounded-lg outline-none text-white"
        />

        <button className="bg-cyan-600 px-4 rounded-lg cursor-pointer">
          Send
        </button>
      </form>
    </div>
  );
}

/* ------------------ SUB COMPONENTS ------------------ */

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

function HeaderAvatar({ avatar, name }) {
  if (avatar)
    return <img src={avatar} className="w-10 h-10 rounded-full object-cover" />;

  return (
    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}
