"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EXAM_V2_SUBJECT_ORDER } from "@/lib/life-exam/examV2Questions";

/** 試験は科目別5ページ。ルートは1科目目へリダイレクト */
export default function LifeExamNewExamPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/life-exam/new/exam/${EXAM_V2_SUBJECT_ORDER[0]}`);
  }, [router]);
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="mx-auto max-w-2xl px-4 py-20">
        <p className="text-[var(--muted)]">読み込み中...</p>
      </main>
    </div>
  );
}
