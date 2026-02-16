import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { supabaseAdmin } from "./supabase";
import { getUserIdFromBearer } from "./auth";

@Controller("tasks")
export class TasksController {
  @Get()
  async list(@Headers("authorization") auth?: string) {
    const userId = await getUserIdFromBearer(auth);

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  @Post()
  async create(
    @Headers("authorization") auth?: string,
    @Body() body?: { title?: string },
  ) {
    const userId = await getUserIdFromBearer(auth);
    const title = (body?.title ?? "").trim();
    if (!title) throw new Error("title is required");

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({ user_id: userId, title, is_done: false })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  @Patch(":id")
  async update(
    @Headers("authorization") auth?: string,
    @Param("id") id?: string,
    @Body() body?: { title?: string; is_done?: boolean },
  ) {
    const userId = await getUserIdFromBearer(auth);
    if (!id) throw new Error("id is required");

    const updates: { title?: string; is_done?: boolean } = {};
    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (t) updates.title = t;
    }
    if (typeof body?.is_done === "boolean") updates.is_done = body.is_done;
    if (Object.keys(updates).length === 0) throw new Error("no updates");

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("task not found");
    return data;
  }

  @Delete(":id")
  async delete(
    @Headers("authorization") auth?: string,
    @Param("id") id?: string,
  ) {
    const userId = await getUserIdFromBearer(auth);
    if (!id) throw new Error("id is required");

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  }
}
