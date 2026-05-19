// app/api/user-profile/route.ts
let profileVersion = 1;  // ← module-level state proves manual revalidation worked

export async function GET() {
  return Response.json({
    name: "Manpreet Kaur",
    email: "manpreet@yeyro.health",
    age: 32,
    healthGoals: ["10000 steps", "7h sleep"],
    profileVersion,
    serverTimestamp: new Date().toISOString(),
  });
}

// optional: a way to bump the version from a Server Action for visual proof
export async function POST() {
  profileVersion++;
  return Response.json({ ok: true, profileVersion });
}