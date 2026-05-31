"use client";

import { deleteUserPosts } from "./actions";

interface DeletePostsButtonProps {
  userId: string;
}

export function DeletePostsButton({ userId }: DeletePostsButtonProps) {
  async function handleDelete() {
    if (!confirm("Delete all posts by this user?")) return;
    await deleteUserPosts(userId);
  }

  return (
    <button
      onClick={handleDelete}
      className="bg-yellow-100 border border-yellow-700 text-yellow-800 px-2 py-0.5 text-[10px] hover:bg-yellow-200 cursor-pointer"
    >
      Del Posts
    </button>
  );
}
