import { supabaseAdmin } from "./supabase";

export async function getUserIdFromBearer(authHeader?: string): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }
  const token = authHeader.slice("Bearer ".length).trim();

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("Invalid token");
  }
  return data.user.id;
}
