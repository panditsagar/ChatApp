"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import AuthCard from "@/components/AuthCard";
import Input from "@/components/Input";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();

  // Form values using useState
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update form state
  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Register user
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { name, email, password } = form;

    if (!name || !email || !password) {
      toast.error("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 🔥 Set displayName
      await updateProfile(userCred.user, { displayName: name });

      // 🔥 FORCE refresh token (important)
      await userCred.user.getIdToken(true);

      toast.success("Account created!");

      router.push("/profile");
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }

    setLoading(false);
  };

  return (
    <AuthCard title="Create Account">
      <form onSubmit={handleRegister}>
        <Input
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
        />

        {error && <p className="text-red-300 text-sm mb-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold mt-2 transition
          ${loading ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"}`}
        >
          {loading ? "Creating..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <span
          onClick={() => router.push("/login")}
          className="text-cyan-300 cursor-pointer"
        >
          Login
        </span>
      </p>
    </AuthCard>
  );
}
