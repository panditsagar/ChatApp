"use client";

import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

import AuthCard from "@/components/AuthCard";
import GoogleButton from "@/components/GoogleButton";
import Input from "@/components/Input";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  // FIXED REDIRECT: must be inside useEffect
  useEffect(() => {
    if (user) {
      router.push("/profile");
    }
  }, [user, router]);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in with Google");
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const loginWithEmail = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth,
        e.target.email.value,
        e.target.password.value
      );
      toast.success("Logged in successfully");
    } catch (err) {
      console.error(err);
      toast.error("Invalid email or password");
    }
  };

  return (
    <AuthCard title="Welcome Back">
      <form onSubmit={loginWithEmail}>
        <Input label="Email" name="email" type="email" />
        <Input label="Password" name="password" type="password" />

        <button
          type="submit"
          className="w-full py-3 bg-cyan-500 rounded-lg font-semibold hover:bg-cyan-600 mt-2"
        >
          Login
        </button>
      </form>

      <GoogleButton onClick={loginWithGoogle} />

      <p className="mt-4 text-center">
        Don't have an account?{" "}
        <span
          onClick={() => router.push("/register")}
          className="text-cyan-300 cursor-pointer"
        >
          Register
        </span>
      </p>
    </AuthCard>
  );
}
