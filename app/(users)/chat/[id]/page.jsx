"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import socket from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const params = useParams();
  const receiverUid = params.id;

  const { user, loading } = useAuth();
  const router = useRouter();

  const [currentChat, setCurrentChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingState, setTypingState] = useState({
    uid: null,
    isTyping: false,
  });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user]);


  

  // INITIAL LOAD
  useEffect(() => {
    if (!loading && user) {
      (async () => {
        try {
          const res = await api.post("/chat/start", {
            receiver_uid: receiverUid,
          });

          const chat = res.chat;

          const list = await api.get("/chat/list");
          setChats(list.chats || []);

          // FIX: match chat_id OR id
          const fullChat =
            list.chats.find(
              (x) => x.chat_id == chat.chat_id || x.chat_id == chat.id
            ) || chat;

          setCurrentChat(fullChat);

          const id = fullChat.chat_id || fullChat.id;
          const msgs = await api.get(`/chat/messages/${id}`);
          setMessages(msgs.messages || []);
        } catch (err) {
          console.log("init error", err);
        }
      })();
    }
  }, [loading, user, receiverUid]);

  // REFRESH helper
  const refreshChats = async (chatId) => {
    const list = await api.get("/chat/list");
    setChats(list.chats || []);

    const id = chatId || currentChat?.chat_id;
    if (id) {
      const msgs = await api.get(`/chat/messages/${id}`);
      setMessages(msgs.messages || []);
    }
  };

  // SOCKET LISTENERS
  useEffect(() => {
    if (!user) return;

    socket.emit("userOnline", user.firebase_uid);

    if (currentChat?.chat_id) socket.emit("join", currentChat.chat_id);

    socket.on("newMessage", (msg) => {
      if (msg.chat_id == currentChat?.chat_id) {
        setMessages((p) => [...p, msg]);

        if (msg.sender_uid !== user.firebase_uid) {
          socket.emit("messageDelivered", {
            chatId: msg.chat_id,
            messageId: msg.id,
            uid: user.firebase_uid,
          });
        }
      } else {
        refreshChats();
      }
    });

    socket.on("chatUpdated", () => refreshChats(currentChat?.chat_id));

    socket.on("typing", (data) => {
      if (data.chatId == currentChat?.chat_id) {
        setTypingState(data);
      }
    });

    socket.on("messageSeen", () => refreshChats(currentChat?.chat_id));

    // online/offline
    socket.on("presenceUpdate", (data) => {
      setChats((prev) =>
        prev.map((c) =>
          c.firebase_uid === data.uid
            ? { ...c, online: data.online, last_active: data.last_active }
            : c
        )
      );

      setCurrentChat((prev) =>
        prev && prev.firebase_uid === data.uid
          ? { ...prev, online: data.online, last_active: data.last_active }
          : prev
      );
    });

    return () => {
      socket.off("newMessage");
      socket.off("chatUpdated");
      socket.off("typing");
      socket.off("messageSeen");
      socket.off("presenceUpdate");
    };
  }, [currentChat, user]);

  if (loading || !user) return <p className="text-white">Loading...</p>;

  return (
    <div className="w-full min-w-[1520px] text-white pt-20">
      <div className="flex w-full" style={{ height: "88.5vh" }}>
        {/* SIDEBAR */}
        <div className="w-[30%] h-full border-r border-white/10 overflow-hidden">
          <ChatSidebar
            chats={chats}
            selectedId={currentChat?.chat_id || currentChat?.id}
            onSelect={async (chatObj, uid) => {
              setCurrentChat(chatObj);

              const chatId = chatObj.chat_id || chatObj.id;
              const msgs = await api.get(`/chat/messages/${chatId}`);
              setMessages(msgs.messages || []);
            }}
          />
        </div>

        {/* CHAT WINDOW */}
        <div className="w-[70%] h-full">
          <ChatWindow
            user={user}
            chat={currentChat}
            messages={messages}
            typingState={typingState}
            onSend={async (text, opts = {}) => {
              const id = currentChat.chat_id || currentChat.id;
              await api.post("/chat/send", {
                chat_id: id,
                message: text,
                type: opts.type || "text",
                url: opts.url,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
