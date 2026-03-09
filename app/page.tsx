import Link from "next/link";

export default function Home() {
  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Home</h1>
      <Link href="/users" className="mt-4 inline-block rounded px-4 py-2 text-black">
        Buka CRUD Users
      </Link>
    </main>
  );
}