import { NextResponse } from "next/server";
import { currentUser, publicUser, userExtra } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk" }, { status: 401 });
  }
  return NextResponse.json({ user: publicUser(user, await userExtra(user.id)) });
}
