"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { LifeExamQuestion, LifeExamSubject } from "@/lib/life-exam/types";
import {
  computeSubjectScoresV2,
  computeTotalAndDeviation,
} from "@/lib/life-exam/scoring";
import { resolveSameAgeNorm } from "@/lib/life-exam/sameAgeNorm";
import {
  EXAM_V2_QUESTIONS,
  EXAM_V2_SUBJECT_ORDER,
  SUBJECT_ID_TO_CODE,
  type SubjectCode,
} from "@/lib/life-exam/examV2Questions";
import Nav from "../../../../components/Nav";

const DRAFT_KEY = "life_exam_draft";

const CODE_TO_INDEX: Record<string, number> = EXAM_V2_SUBJECT_ORDER.reduce(
  (acc, code, i) => ({ ...acc, [code]: i }),
  {}
);

export default function LifeExamSubjectPage() {
  const router = useRouter();
  const params = useParams();
  const subjectCode = (params?.subjectCode as string) || "";
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<LifeExamQuestion[]>([]);
  const [subjects, setSubjects] = useState<LifeExamSubject[]>([]);
  const [profileAgeBand, setProfileAgeBand] = useState<string | null>(null);
  const [profileGender, setProfileGender] = useState<string | null>(null);
  const [profileAspirationType, setProfileAspirationType] = useState<string | null>(null);
  const [profileUniversity, setProfileUniversity] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidCode = EXAM_V2_SUBJECT_ORDER.includes(subjectCode as SubjectCode);
  const currentIndex = CODE_TO_INDEX[subjectCode] ?? 0;
  const isLastSubject = currentIndex === EXAM_V2_SUBJECT_ORDER.length - 1;
  const nextCode = isLastSubject ? null : EXAM_V2_SUBJECT_ORDER[currentIndex + 1];

  const currentSubject = subjects.find((s) => s.code === subjectCode);
  const currentQuestions = questions
    .filter((q) => q.subject_id === currentSubject?.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const questionDefs = currentSubject
    ? (EXAM_V2_QUESTIONS[subjectCode as SubjectCode] ?? [])
    : [];

  const allAnswered =
    currentQuestions.length > 0 &&
    currentQuestions.every((q) => answers[q.id] != null && answers[q.id] >= 0);

  useEffect(() => {
    if (!isValidCode) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/life-exam/new");
        return;
      }
      setUser(session.user);

      const [qRes, sRes, pRes] = await Promise.all([
        supabase
          .from("life_exam_questions")
          .select("id, subject_id, sort_order, label, response_type")
          .eq("response_type", "v2")
          .order("subject_id")
          .order("sort_order"),
        supabase.from("life_exam_subjects").select("id, code, name_ja"),
        supabase
          .from("life_exam_profiles")
          .select("age_band, gender, aspiration_type, university_graduated")
          .eq("user_id", session.user.id)
          .single(),
      ]);

      setQuestions((qRes.data as LifeExamQuestion[]) ?? []);
      setSubjects((sRes.data as LifeExamSubject[]) ?? []);
      if (pRes.data?.age_band) setProfileAgeBand(pRes.data.age_band as string);
      if (pRes.data?.gender) setProfileGender(pRes.data.gender as string);
      if (pRes.data?.aspiration_type) setProfileAspirationType(pRes.data.aspiration_type as string);
      if (pRes.data?.university_graduated) setProfileUniversity(pRes.data.university_graduated as string);

      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const { answers: saved } = JSON.parse(draft) as { answers: Record<string, number> };
          const num: Record<number, number> = {};
          for (const [k, v] of Object.entries(saved || {})) num[Number(k)] = v;
          setAnswers(num);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, [subjectCode, isValidCode, router]);

  const setAnswer = (questionId: number, points: number) => {
    setError(null);
    setAnswers((prev) => ({ ...prev, [questionId]: points }));
  };

  const saveDraftAndNext = () => {
    try {
      const toSave = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [String(k), v])
      );
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: toSave }));
    } catch {
      // ignore
    }
    if (nextCode) router.push(`/life-exam/new/exam/${nextCode}`);
    else handleSubmitFinal();
  };

  const handleSubmitFinal = async () => {
    if (!user || !profileAgeBand) return;
    setError(null);
    setSubmitting(true);

    let allAnswers: Record<number, number>;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const draft = raw ? (JSON.parse(raw) as { answers?: Record<string, number> }).answers ?? {} : {};
      allAnswers = { ...Object.fromEntries(Object.entries(draft).map(([k, v]) => [Number(k), v])), ...Object.fromEntries(Object.entries(answers).map(([k, v]) => [Number(k), v])) };
    } catch {
      setError("保存データの読み込みに失敗しました。");
      setSubmitting(false);
      return;
    }

    const questionSubjectMap: Record<number, number> = {};
    questions.forEach((q) => {
      questionSubjectMap[q.id] = q.subject_id;
    });

    const subjectScores = computeSubjectScoresV2(allAnswers, questionSubjectMap);
    const { totalScore, deviationValue, passed } = computeTotalAndDeviation(subjectScores, null);

    const sameAge = await resolveSameAgeNorm(profileAgeBand, totalScore);

    const { data: attempt, error: attemptErr } = await supabase
      .from("life_exam_attempts")
      .insert({
        user_id: user.id,
        age_band_at_attempt: profileAgeBand,
        gender_at_attempt: profileGender || null,
        aspiration_type_at_attempt: profileAspirationType || null,
        university_at_attempt: profileUniversity || null,
        exam_version: "2",
        total_score: totalScore,
        deviation_value: deviationValue,
        passed,
        same_age_mean: sameAge?.mean ?? null,
        same_age_stddev: sameAge?.stddev ?? null,
        same_age_deviation_value: sameAge?.deviationValue ?? null,
      })
      .select("id")
      .single();

    if (attemptErr || !attempt) {
      setError(attemptErr?.message ?? "受験データの保存に失敗しました。");
      setSubmitting(false);
      return;
    }

    const attemptId = attempt.id;
    const answersRows = Object.entries(allAnswers).map(([questionId, valueNumeric]) => ({
      attempt_id: attemptId,
      question_id: Number(questionId),
      value_numeric: valueNumeric,
      value_text: null,
    }));
    const scoresRows = Object.entries(subjectScores).map(([subjectId, score]) => ({
      attempt_id: attemptId,
      subject_id: Number(subjectId),
      score: Number(score),
    }));

    await supabase.from("life_exam_answers").insert(answersRows);
    await supabase.from("life_exam_scores").insert(scoresRows);
    localStorage.removeItem(DRAFT_KEY);
    setSubmitting(false);
    router.push(`/life-exam/result/${attemptId}`);
  };

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

  if (!user) return null;

  if (!isValidCode) {
    router.replace(`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[0]}`);
    return null;
  }

  const inputClass = "mt-2 w-full";
  const labelClass = "block text-sm font-medium";

  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card-rpg p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {currentSubject?.name_ja ?? subjectCode}
            </h1>
            <span className="text-sm text-sub">
              {currentIndex + 1} / 5 科目
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!allAnswered) {
                setError("全ての選択肢を選択してください。");
                return;
              }
              saveDraftAndNext();
            }}
            className="space-y-8"
          >
            {currentQuestions.map((q, idx) => {
              const def = questionDefs[idx];
              const options = def?.options ?? [];
              return (
                <div key={q.id}>
                  <label className={labelClass}>{q.label}</label>
                  <div className="mt-2 space-y-2">
                    {options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                          answers[q.id] === opt.points
                            ? "border-[var(--rpg-border-bright)] bg-[var(--rpg-accent-red)]/20"
                            : "border-[var(--rpg-border)] bg-[var(--rpg-bg-card)] hover:border-[var(--rpg-border-bright)]/70"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.points}
                          checked={answers[q.id] === opt.points}
                          onChange={() => setAnswer(q.id, opt.points)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {error && <p className="text-sm text-[var(--rpg-accent-red)]">{error}</p>}

            <div className="flex flex-col flex-wrap items-stretch gap-3 pt-4 md:flex-row md:items-center md:justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="btn-rpg-main order-1 w-full whitespace-nowrap md:order-2 md:ml-auto md:w-auto"
              >
                {submitting
                  ? "送信中..."
                  : isLastSubject
                    ? "提出して採点する"
                    : "次へ"}
              </button>
              {currentIndex > 0 ? (
                <Link
                  href={`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[currentIndex - 1]}`}
                  className="btn-rpg-sub order-2 w-full md:order-1 md:w-auto"
                >
                  前の科目へ
                </Link>
              ) : (
                <span className="order-2 hidden md:order-1 md:block" aria-hidden />
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
