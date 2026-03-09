"use client";

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
    fetchUsers();
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
    <main style={{ padding: 24 }}>
      <h1>CRUD Users</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Nama"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button type="submit">
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
            style={{ marginLeft: 8 }}
          >
            Batal
          </button>
        )}
      </form>

      <ul>
        {users.map((user) => (
          <li key={user.id} style={{ marginBottom: 12 }}>
            <strong>{user.name}</strong> - {user.email}
            <button
              onClick={() => handleEdit(user)}
              style={{ marginLeft: 8 }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(user.id)}
              style={{ marginLeft: 8 }}
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}