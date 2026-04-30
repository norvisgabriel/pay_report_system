import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Mi Perfil" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>

      <div className="card p-6">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Correo electrónico</p>
          <p className="text-sm font-medium text-gray-900">{session.user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">El correo no se puede cambiar</p>
        </div>
        <ProfileForm name={session.user.name ?? ""} />
      </div>
    </div>
  );
}
