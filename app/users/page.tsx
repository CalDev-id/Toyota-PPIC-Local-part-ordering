"use client";

import DefaultLayout from "@/components/Layout/DefaultLayout";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  }

  useEffect(() => {
    let mounted = true;

    fetch("/api/users")
      .then((res) => res.json())
      .then((data: User[]) => {
        if (mounted) {
          setUsers(data);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email) return;

    if (editingId !== null) {
      await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });
    }

    setName("");
    setEmail("");
    setEditingId(null);
    fetchUsers();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    fetchUsers();
  }

  function handleEdit(user: User) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
  }

  return (
    <DefaultLayout>
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">CRUD Users</h1>
        <p className="mt-1 text-sm text-slate-600">Tambah, edit, dan hapus user dari database.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
          <input
            type="text"
            placeholder="Nama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none ring-0 transition focus:border-sky-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none ring-0 transition focus:border-sky-500"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {editingId !== null ? "Update User" : "Tambah User"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setEmail("");
              }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <ul className="space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-600">{user.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
    </DefaultLayout>
  );
}
