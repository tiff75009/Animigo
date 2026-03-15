import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "auth_token";
const ADMIN_COOKIE_NAME = "admin_token";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 jours en secondes

function setCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// GET : Récupérer les tokens depuis les cookies httpOnly
export async function GET(request: NextRequest) {
  const authToken = request.cookies.get(COOKIE_NAME)?.value || null;
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value || null;

  return NextResponse.json({ authToken, adminToken });
}

// POST : Stocker un token dans un cookie httpOnly
export async function POST(request: NextRequest) {
  const { token, type } = await request.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token requis" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  const cookieName = type === "admin" ? ADMIN_COOKIE_NAME : COOKIE_NAME;

  response.cookies.set(cookieName, token, setCookieOptions(MAX_AGE));

  // Si c'est un token admin, aussi le stocker comme auth_token
  if (type === "admin") {
    response.cookies.set(COOKIE_NAME, token, setCookieOptions(MAX_AGE));
  }

  return response;
}

// DELETE : Supprimer les cookies
export async function DELETE(request: NextRequest) {
  const { type } = await request.json().catch(() => ({ type: "all" }));

  const response = NextResponse.json({ success: true });

  if (type === "admin" || type === "all") {
    response.cookies.set(ADMIN_COOKIE_NAME, "", setCookieOptions(0));
  }
  if (type === "auth" || type === "all") {
    response.cookies.set(COOKIE_NAME, "", setCookieOptions(0));
  }

  return response;
}
