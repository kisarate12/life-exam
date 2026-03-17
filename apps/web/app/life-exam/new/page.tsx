"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  getAgeBandFromBirthYear,
  getBirthYearFromAge,
  getAgeFromBirthYear,
  AGE_SELECT_MIN,
  AGE_SELECT_MAX,
} from "@/lib/life-exam/ageBand";
import { GENDER_OPTIONS, PREFECTURES } from "@/lib/life-exam/profileOptions";
import { EXAM_V2_SUBJECT_ORDER } from "@/lib/life-exam/examV2Questions";
import Nav from "../../components/Nav";

const ageOptions = Array.from(
  { length: AGE_SELECT_MAX - AGE_SELECT_MIN + 1 },
  (_, i) => AGE_SELECT_MIN + i
);

export default function LifeExamNewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [prefecture, setPrefecture] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // トップページの fullpage.js ナビが他ページに残らないよう削除
  useEffect(() => {
    const nav = document.getElementById("fp-nav") ?? document.querySelector(".fp-nav");
    nav?.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (cancelled) return;
        if (anonError) {
          setAuthError(anonError.message || "匿名認証に失敗しました。");
          setUser(null);
          setLoading(false);
          return;
        }
        session = anonData?.session ?? null;
      }
      if (cancelled) return;
      if (!session?.user) {
        setAuthError("セッションを開始できませんでした。");
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      setAuthError(null);
      const { data: profile } = await supabase
        .from("life_exam_profiles")
        .select("birth_year, gender, prefecture")
        .eq("user_id", session.user.id)
        .single();
      if (cancelled) return;
      if (profile?.birth_year) {
        const a = getAgeFromBirthYear(profile.birth_year);
        if (a >= AGE_SELECT_MIN && a <= AGE_SELECT_MAX) setAge(String(a));
      }
      if (profile?.gender) setGender(profile.gender);
      if (profile?.prefecture) setPrefecture(profile.prefecture);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <p className="text-sub">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen relative z-10">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <div className="card-rpg p-8">
            <p className="text-[var(--theme-text)] font-medium">診断を開始できませんでした</p>
            <p className="mt-2 text-sm text-[var(--theme-text-sub)]">{authError}</p>
            <p className="mt-4 text-sm text-[var(--theme-text-sub)]">
              Supabase の Authentication で「Allow new users to sign up」と「Allow anonymous sign-ins」の両方を有効にしてください。
            </p>
            <Link href="/life-exam" className="btn-rpg-main mt-6 inline-block">
              トップへ戻る
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ageNum = age === "" ? NaN : parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < AGE_SELECT_MIN || ageNum > AGE_SELECT_MAX) {
      setError(`年齢を ${AGE_SELECT_MIN} 〜 ${AGE_SELECT_MAX} の範囲で選択してください。`);
      return;
    }
    if (!prefecture) {
      setError("都道府県を選択してください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const birthYear = getBirthYearFromAge(ageNum);
      const ageBand = getAgeBandFromBirthYear(birthYear);
      const { error: err } = await supabase.from("life_exam_profiles").upsert(
        {
          user_id: user.id,
          birth_year: birthYear,
          age_band: ageBand,
          gender: gender || null,
          prefecture: prefecture || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[0]}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevSkip = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const birthYear = getBirthYearFromAge(30);
      const ageBand = getAgeBandFromBirthYear(birthYear);
      await supabase.from("life_exam_profiles").upsert(
        { user_id: user.id, birth_year: birthYear, age_band: ageBand, gender: "男性", prefecture: "東京都", updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      router.push(`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[0]}`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "mt-2 w-full";
  const labelClass = "block text-sm font-medium";

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card-rpg p-8">
          <h1 className="text-2xl font-bold">
            基本情報
          </h1>
          <p className="mt-2 text-sm text-sub">
            年齢・性別・都道府県を入力してください。
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className={labelClass}>年齢</label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">選択してください</option>
                {ageOptions.map((a) => (
                  <option key={a} value={a}>
                    {a} 歳
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>性別（任意）</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputClass}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value || "none"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>都道府県</label>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-[var(--rpg-accent-red)]">{error}</p>
            )}
            {process.env.NODE_ENV === "development" && (
              <button type="button" onClick={handleDevSkip} disabled={submitting}
                className="w-full rounded-lg bg-yellow-400 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50">
                ⚡ DEV: サンプル入力してスキップ
              </button>
            )}
            <div className="flex flex-col flex-wrap gap-3 pt-2 md:flex-row md:items-center md:justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="btn-rpg-main order-1 w-full whitespace-nowrap md:order-2 md:ml-auto md:w-auto"
              >
                {submitting ? "保存中..." : "次へ（診断へ）"}
              </button>
              <Link href="/life-exam" className="btn-rpg-sub order-2 w-full md:order-1 md:w-auto">
                戻る
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
