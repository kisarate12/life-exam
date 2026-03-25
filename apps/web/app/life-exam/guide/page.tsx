import Link from "next/link";
import Nav from "../../components/Nav";

const AXES = [
  {
    index: 1,
    label: "金融",
    description: "収入・資産など「お金まわり」の充実度",
    good: { code: "M", name: "Money", meaning: "金融が充実している" },
    bad:  { code: "P", name: "Poor",  meaning: "金融が手薄な状態" },
    note: "M は収入・資産の両方が一定水準を超えているとき。P はどちらか一方でも低いとき。",
  },
  {
    index: 2,
    label: "時間",
    description: "自分のための時間がどれだけあるか",
    good: { code: "F", name: "Free",  meaning: "時間に余裕がある" },
    bad:  { code: "B", name: "Busy",  meaning: "時間が常に不足している" },
    note: "労働時間・睡眠・自由時間のバランスで判定。F は本当の意味で「自分の時間」を持てている状態。",
  },
  {
    index: 3,
    label: "人間関係",
    description: "家族・友人・パートナーとのつながりの質",
    good: { code: "C", name: "Connected", meaning: "人間関係が豊か" },
    bad:  { code: "L", name: "Lonely",    meaning: "孤立・疎遠な状態" },
    note: "人間関係の「量」より「質」で判定。孤独を感じているか、信頼できる人がいるかどうか。",
  },
  {
    index: 4,
    label: "健康",
    description: "身体・精神の健康状態",
    good: { code: "H", name: "Healthy", meaning: "健康が維持できている" },
    bad:  { code: "S", name: "Sick",    meaning: "健康に問題を抱えている" },
    note: "運動習慣・睡眠・精神的な余裕を総合的に評価。S でも深刻な病気とは限らず「余裕のなさ」を示す。",
  },
];

const WORLDS = [
  {
    name: "空の世界",
    code: "MF",
    description: "お金も時間も手にした、最上位の世界。物質的には何不自由ない状態だが、その先に何を見るかが問われる。",
    characters: [
      { code: "MFCH", name: "アマテラスオオミカミ", desc: "すべてが揃った人生の頂点。" },
      { code: "MFLH", name: "孤独な大王",           desc: "豊かさの中に、つながりだけが欠ける。" },
      { code: "MFCS", name: "スフィンクス",         desc: "知恵と余裕を持つが、健康が影を落とす。" },
      { code: "MFLS", name: "カイコ",               desc: "繭の中の豊かさ。外とのつながりが薄い。" },
    ],
    color: "#6B66A3",
    bg: "#F5F4FF",
  },
  {
    name: "海の世界",
    code: "PF",
    description: "お金は多くないが、時間は自分のもの。自由を選んだ者たちの世界。豊かさの定義を問い直す場所。",
    characters: [
      { code: "PFCH", name: "ツクヨミ",   desc: "静かに月を眺める、穏やかな自由人。" },
      { code: "PFLH", name: "没落貴族",   desc: "お金は失ったが、品格と余裕は残っている。" },
      { code: "PFCS", name: "ナマケモノ", desc: "争わず、マイペースに生きることを選んだ。" },
      { code: "PFLS", name: "カタツムリ", desc: "殻の中は居心地がいい。でも外が気になり始めている。" },
    ],
    color: "#3B82A0",
    bg: "#F0F8FF",
  },
  {
    name: "地上の世界",
    code: "MB",
    description: "お金は稼いでいるが、時間がない。結果を出し続ける者たちの世界。「何のために稼ぐか」が問われる。",
    characters: [
      { code: "MBCH", name: "ドワーフの王",   desc: "誰よりも働き、誰よりも豊かにしてきた。" },
      { code: "MBLH", name: "騎士",           desc: "誠実に使命を果たす。休む時間だけがない。" },
      { code: "MBCS", name: "タヌキ",         desc: "要領よく立ち回るが、体か人間関係のどこかに無理がある。" },
      { code: "MBLS", name: "フンコロガシ",   desc: "お金だけが積み上がる。立ち止まる時が来た。" },
    ],
    color: "#7B6C3E",
    bg: "#FFFBF0",
  },
  {
    name: "やみのせかい",
    code: "PB",
    description: "お金も時間も手薄な、最も厳しい世界。だが、ここにいる者は強い。這い上がる力を持っている。",
    characters: [
      { code: "PBCH", name: "オークの族長", desc: "貧しくても笑える。仲間と健康が財産。" },
      { code: "PBLH", name: "流れ者",       desc: "健康な体一つ。次の物語はこれから始まる。" },
      { code: "PBCS", name: "ハイエナ",     desc: "まだ終わっていない。しぶとさが武器になる。" },
      { code: "PBLS", name: "蚊",           desc: "すべてが底をついた。でも今日も生きている。" },
    ],
    color: "#6B3333",
    bg: "#FFF5F5",
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen relative z-10">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">

        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            診断コードの読み方
          </h1>
          <p className="mt-2 text-sm text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.8 }}>
            4文字のコードと4つの世界について解説します
          </p>
        </div>

        {/* 4文字コードとは */}
        <section className="card-rpg p-5 sm:p-6 mb-6">
          <h2 className="section-header text-lg mb-1">📊 4文字コードとは</h2>
          <p className="text-xs text-[#9A9290] mb-4" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            診断結果に表示される英字4文字（例：MFCH）は、あなたの人生の4つの軸それぞれの状態を示しています。
          </p>
          <div className="rounded-xl bg-[#F5F0EB] px-4 py-3 mb-4 text-center">
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-[#333333]">M F C H</span>
            <div className="mt-2 flex justify-center gap-0">
              {["金融", "時間", "人間関係", "健康"].map((label, i) => (
                <span key={i} className="w-[3.2rem] text-center text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#9A9290] text-center" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
            左から順に「金融・時間・人間関係・健康」の状態を表します
          </p>
        </section>

        {/* 各軸の説明 */}
        <section className="mb-6">
          <h2 className="section-header text-lg mb-3 px-1">🔤 各軸の意味</h2>
          <div className="space-y-3">
            {AXES.map((axis) => (
              <div key={axis.label} className="card-rpg p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#F57550" }}>
                    {axis.index}
                  </span>
                  <h3 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    {axis.label}
                  </h3>
                  <span className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                    {axis.description}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-xl border border-[#E8DDD0] bg-white p-3 text-center">
                    <span className="font-mono text-2xl font-bold text-[#43756B]">{axis.good.code}</span>
                    <p className="mt-0.5 text-xs font-bold text-[#43756B]">{axis.good.name}</p>
                    <p className="mt-1 text-xs text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{axis.good.meaning}</p>
                  </div>
                  <div className="rounded-xl border border-[#E8DDD0] bg-white p-3 text-center">
                    <span className="font-mono text-2xl font-bold text-[#F57550]">{axis.bad.code}</span>
                    <p className="mt-0.5 text-xs font-bold text-[#F57550]">{axis.bad.name}</p>
                    <p className="mt-1 text-xs text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{axis.bad.meaning}</p>
                  </div>
                </div>
                <p className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.7 }}>
                  💡 {axis.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4つの世界 */}
        <section className="mb-6">
          <h2 className="section-header text-lg mb-3 px-1">🌍 4つの世界</h2>
          <p className="mb-3 px-1 text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.7 }}>
            1文字目（金融）と2文字目（時間）の組み合わせで、あなたが属する「世界」が決まります。
          </p>
          <div className="space-y-3">
            {WORLDS.map((world) => (
              <div key={world.name} className="card-rpg overflow-hidden">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #E8DDD0" }}>
                  <span
                    className="font-mono text-lg font-bold shrink-0"
                    style={{ color: world.color }}
                  >{world.code}??</span>
                  <div>
                    <h3 className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
                      {world.name}
                    </h3>
                    <p className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.6 }}>
                      {world.description}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3" style={{ background: world.bg }}>
                  {world.characters.map((c) => (
                    <div key={c.code} className="flex items-baseline gap-2 py-1">
                      <span className="font-mono text-xs font-bold shrink-0" style={{ color: world.color }}>{c.code}</span>
                      <span className="text-sm font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>{c.name}</span>
                      <span className="text-xs text-[#9A9290]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>— {c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 診断を受けるCTA */}
        <div className="text-center">
          <Link
            href="/life-exam"
            className="inline-block rounded-xl px-8 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #F57550, #FFB84E)", boxShadow: "0 4px 16px rgba(245,117,80,0.35)" }}
          >
            診断を受ける →
          </Link>
        </div>

      </main>
    </div>
  );
}
