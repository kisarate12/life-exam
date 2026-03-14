"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [prefecture, setPrefecture] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      const { data: profile } = await supabase
        .from("life_exam_profiles")
        .select("birth_year, gender, prefecture")
        .eq("user_id", session.user.id)
        .single();
      if (profile?.birth_year) {
        const a = getAgeFromBirthYear(profile.birth_year);
        if (a >= AGE_SELECT_MIN && a <= AGE_SELECT_MAX) setAge(String(a));
      }
      if (profile?.gender) setGender(profile.gender);
      if (profile?.prefecture) setPrefecture(profile.prefecture);
      setLoading(false);
    })();
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

  if (!user) {
    router.replace("/login");
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
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[0]}`);
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
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-rpg-main"
              >
                {submitting ? "保存中..." : "次へ（診断へ）"}
              </button>
              <Link href="/life-exam" className="btn-rpg-sub">
                戻る
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
