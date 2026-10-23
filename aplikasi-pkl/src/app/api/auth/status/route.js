import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { publicUser, userExtra } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ masuk: false });

  const extra = await userExtra(user.id);
  return NextResponse.json({ masuk: true, user: publicUser(user, extra) });
}
