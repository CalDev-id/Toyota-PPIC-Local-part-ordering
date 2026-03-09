import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users ORDER BY id DESC"
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Gagal ambil data users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email } = body;

    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );

    return Response.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Gagal tambah user" },
      { status: 500 }
    );
  }
}