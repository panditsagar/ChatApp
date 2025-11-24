"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FiCamera } from "react-icons/fi";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Avatar States
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "",
    dob: "",
    bio: "",
  });

  // ----------------------------
  // INSTANT AVATAR UPLOAD
  // ----------------------------
  const handleInstantAvatarUpload = async (file) => {
    try {
      // --- VALIDATIONS FOR PRODUCTION ---

      // 1. File size limit (max 3MB)
      if (file.size > 3 * 1024 * 1024) {
        toast.error("Image too large. Max 3MB allowed.");
        return;
      }

      // 2. Allowed file types
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPG, PNG or WEBP formats are allowed.");
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const token = await auth.currentUser.getIdToken();

      const res = await fetch("https://chatapp-api-production-d8c0.up.railway.app/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // --- Handle HTTP error ---
      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();

      // API didn't return URL
      if (!data?.url) {
        throw new Error("No URL returned from server.");
      }

      // SUCCESS → Update UI
      setProfile((prev) => ({ ...prev, avatar: data.url }));
      toast.success("Avatar updated successfully!");
    } catch (err) {
      console.error("Avatar upload error:", err);

      toast.error("Failed to upload avatar. Please try again.");
      // Optionally roll back preview
      // setAvatarPreview(null);
    } finally {
      // ALWAYS stop loading animation
      setUploading(false);
    }
  };

  // ----------------------------
  // Handle Avatar Select
  // ----------------------------
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));

    // Upload instantly
    handleInstantAvatarUpload(file);
  };

  // ----------------------------
  // Fetch User Profile
  // ----------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/profile");
        const user = res?.user || res?.data?.user || res;

        setProfile(user);

        setForm({
          name: user?.name || "",
          phone: user?.phone || "",
          gender: user?.gender || "",
          dob: user?.dob ? user.dob.split("T")[0] : "",
          bio: user?.bio || "",
        });
      } catch (error) {
        console.error("Profile fetch error:", error);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const getInitial = () => {
    if (!profile?.name) return "U"; // fallback
    return profile.name.charAt(0).toUpperCase();
  };

  // ----------------------------
  // Handle Input Change
  // ----------------------------
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ----------------------------
  // Update Profile (text fields)
  // ----------------------------
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const res = await api.put("/user/update", {
        ...form,
        avatar: profile?.avatar,
      });

      const updated = res?.user || res?.data?.user;
      setProfile(updated);
      setEditMode(false);

      toast.success("Profile updated successfully!"); // ⭐ ADDED
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile."); // ⭐ ADDED
    }
  };

  if (loading)
    return <p className="text-gray-300 text-center">Loading profile...</p>;

  return (
    <div className="max-w-2xl  mx-auto bg-white/10 p-6 rounded-xl mt-6 backdrop-blur-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Your Profile</h2>

      {/* Avatar Section */}
      <div className="relative flex flex-col items-center gap-3 mb-6">
        <div className="relative">
          {/* Avatar Image */}
          {avatarPreview || profile?.avatar ? (
            <img
              src={avatarPreview || profile?.avatar}
              className="w-32 h-32 rounded-full  object-cover shadow-lg transition-all duration-300"
            />
          ) : (
            <div className="w-32 h-32 rounded-full  bg-white/20 backdrop-blur-md shadow-lg flex items-center justify-center text-5xl font-semibold text-white">
              {getInitial()}
            </div>
          )}

          {/* Camera Icon — Only in Edit Mode */}
          {editMode && (
            <label className="absolute bottom-2 right-2 bg-white/40 hover:bg-white/50 p-2 rounded-full cursor-pointer shadow-lg transition">
              <FiCamera className="text-white text-lg" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          )}

          {/* ANIMATED LOADER OVERLAY */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex justify-center items-center">
              <div className="w-10 h-10 border-4 border-transparent border-t-cyan-400 border-l-cyan-400 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE */}
      {!editMode ? (
        <div className="text-gray-200 space-y-2">
          <p>
            <strong>Name:</strong> {profile?.name}
          </p>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Phone:</strong> {profile?.phone || "—"}
          </p>
          <p>
            <strong>Gender:</strong> {profile?.gender || "—"}
          </p>
          <p>
            <strong>DOB:</strong> {profile?.dob?.split("T")[0] || "—"}
          </p>
          <p>
            <strong>Bio:</strong> {profile?.bio || "No bio yet"}
          </p>

          <button
            onClick={() => setEditMode(true)}
            className="w-full mt-4 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-600 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>
      ) : (
        // EDIT MODE FORM
        <form onSubmit={handleUpdate} className="text-gray-200 space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-3 rounded bg-white/20 outline-none"
          />

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone number"
            className="w-full p-3 rounded bg-white/20 outline-none"
          />

          <div className="flex gap-4">
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-1/2 p-3 rounded bg-white/20 outline-none"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className="w-1/2 p-3 rounded bg-white/20 outline-none"
            />
          </div>

          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Write your bio"
            rows="3"
            className="w-full p-3 rounded bg-white/20 outline-none"
          />

          <div className="flex justify-between gap-6">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="w-full py-3 bg-red-500 rounded-lg hover:bg-red-600 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="w-full py-3 bg-green-500 rounded-lg hover:bg-green-600 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
