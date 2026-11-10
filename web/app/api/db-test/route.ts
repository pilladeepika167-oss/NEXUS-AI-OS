
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    return NextResponse.json({
      success: true,
      message: "NEXUS connected to PostgreSQL!",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed.",
      },
      { status: 500 }
    );
  }
}
