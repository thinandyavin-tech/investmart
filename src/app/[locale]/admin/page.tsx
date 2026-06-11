import { prisma } from "@/lib/prisma";
import { banUser, unbanUser } from "./actions";
import { DeletePostsButton } from "./DeletePostsButton";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [totalUsers, totalPosts, users] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        email:     true,
        username:  true,
        name:      true,
        createdAt: true,
        bannedAt:  true,
        _count:    { select: { posts: true, holdings: true, tradeHistory: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users",  value: totalUsers },
          { label: "Total Posts",  value: totalPosts },
          { label: "Banned",       value: users.filter(u => u.bannedAt).length },
          { label: "Active",       value: users.filter(u => !u.bannedAt).length },
        ].map(({ label, value }) => (
          <div key={label} className="border-2 border-[#1F1A14] bg-white p-4" style={{ boxShadow: "3px 3px 0 #1F1A14" }}>
            <p className="text-xs font-mono text-[#8A8378]">{label}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="border-2 border-[#1F1A14]" style={{ boxShadow: "4px 4px 0 #1F1A14" }}>
        <div className="bg-[#1F1A14] px-4 py-2">
          <span className="text-xs font-mono font-bold text-[#FBF7ED]">ALL USERS ({users.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#F0EBE0] border-b-2 border-[#1F1A14]">
              <tr>
                {["Username", "Email", "Name", "Joined", "Posts", "Holdings", "Trades", "Status", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-[#1F1A14]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-[#E5DFD4] ${u.bannedAt ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-[#FDFAF4]"}`}>
                  <td className="px-3 py-2 font-bold">{u.username ?? "—"}</td>
                  <td className="px-3 py-2 text-[#8A8378] max-w-[180px] truncate">{u.email ?? "—"}</td>
                  <td className="px-3 py-2">{u.name ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("th-TH")}</td>
                  <td className="px-3 py-2 text-center">{u._count.posts}</td>
                  <td className="px-3 py-2 text-center">{u._count.holdings}</td>
                  <td className="px-3 py-2 text-center">{u._count.tradeHistory}</td>
                  <td className="px-3 py-2">
                    {u.bannedAt
                      ? <span className="text-red-600 font-bold">BANNED</span>
                      : <span className="text-green-700">Active</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {u.bannedAt ? (
                        <form action={unbanUser.bind(null, u.id)}>
                          <button className="bg-green-100 border border-green-700 text-green-800 px-2 py-0.5 text-xs hover:bg-green-200 cursor-pointer">
                            Unban
                          </button>
                        </form>
                      ) : (
                        <form action={banUser.bind(null, u.id)}>
                          <button className="bg-red-100 border border-red-700 text-red-800 px-2 py-0.5 text-xs hover:bg-red-200 cursor-pointer">
                            Ban
                          </button>
                        </form>
                      )}
                      <DeletePostsButton userId={u.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
