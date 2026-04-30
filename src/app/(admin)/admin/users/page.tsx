import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { UserRoleToggle } from "@/components/admin/user-role-toggle";

export const metadata: Metadata = { title: "Usuarios" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 20;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { payments: true } },
        accounts: { select: { provider: true } },
      },
    }),
    prisma.user.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Usuarios ({total})</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Auth</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Registro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {u.accounts.map((a) => (
                        <span key={a.provider} className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">
                          {a.provider}
                        </span>
                      ))}
                      {u.accounts.length === 0 && (
                        <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs">email</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u._count.payments}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <UserRoleToggle
                      userId={u.id}
                      currentRole={u.role}
                      isSelf={u.id === session?.user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
          </div>
        )}
      </div>
    </div>
  );
}
