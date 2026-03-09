// import { pool } from "@/lib/db";

// type Context = {
//   params: Promise<{ id: string }>;
// };

// export async function GET(_: Request, { params }: Context) {
//   try {
//     const { id } = await params;

//     const result = await pool.query(
//       "SELECT id, name, email, created_at FROM users WHERE id = $1",
//       [id]
//     );

//     if (result.rowCount === 0) {
//       return Response.json({ message: "User tidak ditemukan" }, { status: 404 });
//     }

//     return Response.json(result.rows[0]);
//   } catch (error) {
//     console.error(error);
//     return Response.json(
//       { message: "Gagal ambil user" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(req: Request, { params }: Context) {
//   try {
//     const { id } = await params;
//     const body = await req.json();
//     const { name, email } = body;

//     const result = await pool.query(
//       "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
//       [name, email, id]
//     );

//     if (result.rowCount === 0) {
//       return Response.json({ message: "User tidak ditemukan" }, { status: 404 });
//     }

//     return Response.json(result.rows[0]);
//   } catch (error) {
//     console.error(error);
//     return Response.json(
//       { message: "Gagal update user" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(_: Request, { params }: Context) {
//   try {
//     const { id } = await params;

//     const result = await pool.query(
//       "DELETE FROM users WHERE id = $1 RETURNING *",
//       [id]
//     );

//     if (result.rowCount === 0) {
//       return Response.json({ message: "User tidak ditemukan" }, { status: 404 });
//     }

//     return Response.json({ message: "User berhasil dihapus" });
//   } catch (error) {
//     console.error(error);
//     return Response.json(
//       { message: "Gagal hapus user" },
//       { status: 500 }
//     );
//   }
// }