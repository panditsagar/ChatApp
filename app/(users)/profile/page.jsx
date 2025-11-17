"use client";

import UserProfile from "@/components/UserProfile";

export default function Dashboard() {

  return (
    <div className=" text-white p-6">
      {/* User Profile Section */}
      <div className="flex mt-13 w-3xl">
        <div className="w-full">
          <UserProfile />
        </div>
      </div>
    </div>
  );
}
