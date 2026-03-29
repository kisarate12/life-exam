/**
 * TikTok カード画像生成スクリプト
 * Usage:
 *   node tiktok-cards/generate.mjs                          # 全カード生成
 *   node tiktok-cards/generate.mjs PFCH MFCH                # 特定コードだけ生成
 *   node tiktok-cards/generate.mjs --cover MFCH,MBCH,PFCH   # カバー画像
 *   node tiktok-cards/generate.mjs --theme purple            # カラーテーマ指定
 *   node tiktok-cards/generate.mjs --preset bocchi           # プリセット一式生成
 *   node tiktok-cards/generate.mjs --list-presets            # プリセット一覧
 *   node tiktok-cards/generate.mjs --list-themes             # テーマ一覧
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "template.html");
const TEMPLATE_CTA = path.resolve(__dirname, "template-cta.html");
const TEMPLATE_COVER = path.resolve(__dirname, "template-cover.html");
const TEMPLATE_PERSONA = path.resolve(__dirname, "template-persona.html");
const TEMPLATE_TIERLIST = path.resolve(__dirname, "template-tierlist.html");
const TEMPLATE_HOOK = path.resolve(__dirname, "template-hook.html");
const OUTPUT_DIR = path.resolve(__dirname, "output");
const CHAR_DIR = path.resolve(
  __dirname,
  "../apps/web/public/life-diagnosis/characters"
);

// ============================================================
// カラーテーマ定義
// ============================================================
const THEMES = {
  orange: {
    name: "オレンジ（デフォルト）",
    bgBase: "#1a1a2e",
    bgMid: "#16213e",
    bgGlow1: "rgba(255, 184, 78, 0.18)",
    bgGlow2: "rgba(245, 117, 80, 0.12)",
    accentGradient:
      "linear-gradient(135deg, #FFB84E 0%, #F57550 50%, #FFB84E 100%)",
    accentShadow: "rgba(245, 117, 80, 0.6)",
    accentText: "#FFB84E",
    tagBg: "rgba(245, 117, 80, 0.15)",
    tagBorder: "rgba(245, 117, 80, 0.4)",
    tagColor: "#FF9A76",
    ringColor1: "rgba(255, 184, 78, 0.5)",
    ringColor2: "rgba(245, 117, 80, 0.3)",
    statHigh: "linear-gradient(90deg, #43756B, #5CAF9E)",
    statHighShadow: "rgba(92, 175, 158, 0.4)",
    statHighRank: "#5CAF9E",
    statLow: "linear-gradient(90deg, #F57550, #FF8F6B)",
    statLowShadow: "rgba(245, 117, 80, 0.4)",
    statLowRank: "#F57550",
  },
  purple: {
    name: "パープル",
    bgBase: "#1a1425",
    bgMid: "#1e1640",
    bgGlow1: "rgba(180, 130, 255, 0.20)",
    bgGlow2: "rgba(130, 80, 220, 0.12)",
    accentGradient:
      "linear-gradient(135deg, #C084FC 0%, #8B5CF6 50%, #C084FC 100%)",
    accentShadow: "rgba(139, 92, 246, 0.6)",
    accentText: "#C084FC",
    tagBg: "rgba(139, 92, 246, 0.15)",
    tagBorder: "rgba(139, 92, 246, 0.4)",
    tagColor: "#D8B4FE",
    ringColor1: "rgba(192, 132, 252, 0.5)",
    ringColor2: "rgba(139, 92, 246, 0.3)",
    statHigh: "linear-gradient(90deg, #7C3AED, #A78BFA)",
    statHighShadow: "rgba(167, 139, 250, 0.4)",
    statHighRank: "#A78BFA",
    statLow: "linear-gradient(90deg, #F57550, #FF8F6B)",
    statLowShadow: "rgba(245, 117, 80, 0.4)",
    statLowRank: "#F57550",
  },
  red: {
    name: "レッド/ダーク",
    bgBase: "#1a1015",
    bgMid: "#2a1520",
    bgGlow1: "rgba(255, 80, 80, 0.20)",
    bgGlow2: "rgba(200, 50, 50, 0.12)",
    accentGradient:
      "linear-gradient(135deg, #FF6B6B 0%, #EE4444 50%, #FF6B6B 100%)",
    accentShadow: "rgba(238, 68, 68, 0.6)",
    accentText: "#FF6B6B",
    tagBg: "rgba(238, 68, 68, 0.15)",
    tagBorder: "rgba(238, 68, 68, 0.4)",
    tagColor: "#FCA5A5",
    ringColor1: "rgba(255, 107, 107, 0.5)",
    ringColor2: "rgba(238, 68, 68, 0.3)",
    statHigh: "linear-gradient(90deg, #DC2626, #F87171)",
    statHighShadow: "rgba(248, 113, 113, 0.4)",
    statHighRank: "#F87171",
    statLow: "linear-gradient(90deg, #6B7280, #9CA3AF)",
    statLowShadow: "rgba(156, 163, 175, 0.4)",
    statLowRank: "#9CA3AF",
  },
  blue: {
    name: "ブルー",
    bgBase: "#0f172a",
    bgMid: "#1e293b",
    bgGlow1: "rgba(56, 189, 248, 0.20)",
    bgGlow2: "rgba(59, 130, 246, 0.12)",
    accentGradient:
      "linear-gradient(135deg, #38BDF8 0%, #3B82F6 50%, #38BDF8 100%)",
    accentShadow: "rgba(59, 130, 246, 0.6)",
    accentText: "#38BDF8",
    tagBg: "rgba(59, 130, 246, 0.15)",
    tagBorder: "rgba(59, 130, 246, 0.4)",
    tagColor: "#7DD3FC",
    ringColor1: "rgba(56, 189, 248, 0.5)",
    ringColor2: "rgba(59, 130, 246, 0.3)",
    statHigh: "linear-gradient(90deg, #2563EB, #60A5FA)",
    statHighShadow: "rgba(96, 165, 250, 0.4)",
    statHighRank: "#60A5FA",
    statLow: "linear-gradient(90deg, #F57550, #FF8F6B)",
    statLowShadow: "rgba(245, 117, 80, 0.4)",
    statLowRank: "#F57550",
  },
  green: {
    name: "グリーン",
    bgBase: "#0f1f1a",
    bgMid: "#15302a",
    bgGlow1: "rgba(52, 211, 153, 0.20)",
    bgGlow2: "rgba(16, 185, 129, 0.12)",
    accentGradient:
      "linear-gradient(135deg, #34D399 0%, #10B981 50%, #34D399 100%)",
    accentShadow: "rgba(16, 185, 129, 0.6)",
    accentText: "#34D399",
    tagBg: "rgba(16, 185, 129, 0.15)",
    tagBorder: "rgba(16, 185, 129, 0.4)",
    tagColor: "#6EE7B7",
    ringColor1: "rgba(52, 211, 153, 0.5)",
    ringColor2: "rgba(16, 185, 129, 0.3)",
    statHigh: "linear-gradient(90deg, #059669, #34D399)",
    statHighShadow: "rgba(52, 211, 153, 0.4)",
    statHighRank: "#34D399",
    statLow: "linear-gradient(90deg, #F57550, #FF8F6B)",
    statLowShadow: "rgba(245, 117, 80, 0.4)",
    statLowRank: "#F57550",
  },
};

// ============================================================
// カード定義（全16キャラ）
// ============================================================
const CARDS = {
  MFCH: {
    code: "MFCH",
    name: "イカロス",
    world: "空の世界",
    worldIcon: "☀️",
    worldColor: "#4A90D9",
    filename: "MFCH_icarus",
    stats: [
      { label: "資産", pct: 82, rank: "A", level: "high" },
      { label: "収入", pct: 85, rank: "A", level: "high" },
      { label: "人間関係", pct: 78, rank: "A", level: "high" },
      { label: "時間", pct: 80, rank: "A", level: "high" },
      { label: "健康", pct: 76, rank: "B", level: "high" },
    ],
    comment:
      '4つの翼を広げ<span class="hl">頂点</span>に立つ者。<br>全てが揃ったその先に、<br>あなたは<span class="hl">何を目指す</span>のか。',
    persona: {
      catchline: '平日昼間に<span class="hl">犬の散歩</span>してる<br>謎のオジサン',
      description: '港区のタワマンに住んでて<br>昼からカフェで<span class="hl">MacBook</span>開いてる。<br>何で稼いでるか誰も知らない。<br>インスタは<span class="hl">海外旅行</span>の写真ばかり。',
      quote: 'サラリーマンとは生きてる世界が違う',
    },
  },
  MFLH: {
    code: "MFLH",
    name: "孤独な大王",
    world: "空の世界",
    worldIcon: "☀️",
    worldColor: "#4A90D9",
    filename: "MFLH_lonely_king",
    stats: [
      { label: "資産", pct: 80, rank: "A", level: "high" },
      { label: "収入", pct: 78, rank: "A", level: "high" },
      { label: "人間関係", pct: 25, rank: "D", level: "low" },
      { label: "時間", pct: 82, rank: "A", level: "high" },
      { label: "健康", pct: 74, rank: "B", level: "high" },
    ],
    comment:
      'お金も時間も健康もある。<br>でも<span class="hl">誰もいない</span>。<br>城はある、剣もある、<br>宴を共にする<span class="hl">仲間</span>がいない。',
    persona: {
      catchline: 'タワマン最上階に<br><span class="hl">一人で住んでる</span>IT社長',
      description: 'ウーバーイーツの履歴が<span class="hl">3年分</span>ある。<br>話し相手はChatGPTだけ。<br>金曜の夜は一人で<span class="hl">Netflix</span>。<br>マッチングアプリは全部課金済み。',
      quote: '城はあるが宴を共にする者がいない',
    },
  },
  MFCS: {
    code: "MFCS",
    name: "スフィンクス",
    world: "空の世界",
    worldIcon: "☀️",
    worldColor: "#4A90D9",
    filename: "MFCS_sphinx",
    stats: [
      { label: "資産", pct: 80, rank: "A", level: "high" },
      { label: "収入", pct: 78, rank: "A", level: "high" },
      { label: "人間関係", pct: 75, rank: "B", level: "high" },
      { label: "時間", pct: 80, rank: "A", level: "high" },
      { label: "健康", pct: 28, rank: "D", level: "low" },
    ],
    comment:
      '全てを手にしたのに<br><span class="hl">体</span>だけが悲鳴を上げている。<br>肉体は有限。そろそろ<br>自分を<span class="hl">神聖視</span>してみては。',
    persona: {
      catchline: '経営者なのに<br><span class="hl">健康診断オールC</span>のタイプ',
      description: '毎晩接待で酒を浴びて<br>運動は<span class="hl">駅の階段</span>だけ。<br>人間ドックの結果を見て見ぬふり。<br>金あるのに<span class="hl">ジムの会費</span>だけ払って行かない。',
      quote: '金で健康は買えなかった',
    },
  },
  MFLS: {
    code: "MFLS",
    name: "カイコ",
    world: "空の世界",
    worldIcon: "☀️",
    worldColor: "#4A90D9",
    filename: "MFLS_kaiko",
    stats: [
      { label: "資産", pct: 78, rank: "A", level: "high" },
      { label: "収入", pct: 76, rank: "B", level: "high" },
      { label: "人間関係", pct: 22, rank: "E", level: "low" },
      { label: "時間", pct: 80, rank: "A", level: "high" },
      { label: "健康", pct: 25, rank: "D", level: "low" },
    ],
    comment:
      'お金も時間もあるのに<br><span class="hl">世界</span>から切り離された繭の中。<br>外へ羽ばたく準備は<br>もう<span class="hl">できている</span>はず。',
    persona: {
      catchline: '投資で稼いでるが<br><span class="hl">3年外出してない</span>タイプ',
      description: '<span class="hl">Uber Eats</span>と出前館がライフライン。<br>友達の最後の連絡は2年前の「元気？」。<br>部屋はモニター4枚。<br>日光を最後に浴びたのは<span class="hl">先月の宅配受け取り</span>。',
      quote: '繭の中は快適だが世界は動いている',
    },
  },
  PFCH: {
    code: "PFCH",
    name: "ツクヨミ",
    world: "海の世界",
    worldIcon: "🌊",
    worldColor: "#1B6B93",
    filename: "PFCH_tsukuyomi",
    stats: [
      { label: "資産", pct: 28, rank: "D", level: "low" },
      { label: "収入", pct: 32, rank: "D", level: "low" },
      { label: "人間関係", pct: 78, rank: "A", level: "high" },
      { label: "時間", pct: 88, rank: "S", level: "high" },
      { label: "健康", pct: 76, rank: "B", level: "high" },
    ],
    comment:
      '時間の自由を手にした<span class="hl">月の住人</span>。<br>お金より大切なものを<br>すでに手に入れている。<br>あとは<span class="hl">「お金」</span>だけ。',
    persona: {
      catchline: '実家暮らしの<span class="hl">ニート</span>か<br>旦那の金で遊ぶ<span class="hl">主婦</span>',
      description: '平日昼間にカフェで<span class="hl">ママ友とランチ</span>。<br>旦那のカードで買い物して<br>「今月ピンチ〜」が口癖。<br>インスタのストーリーは<span class="hl">毎日更新</span>。',
      quote: '働かないという贅沢を手に入れた者',
    },
  },
  PFLH: {
    code: "PFLH",
    name: "没落貴族",
    world: "海の世界",
    worldIcon: "🌊",
    worldColor: "#1B6B93",
    filename: "PFLH_noble",
    stats: [
      { label: "資産", pct: 30, rank: "D", level: "low" },
      { label: "収入", pct: 28, rank: "D", level: "low" },
      { label: "人間関係", pct: 25, rank: "D", level: "low" },
      { label: "時間", pct: 85, rank: "A", level: "high" },
      { label: "健康", pct: 74, rank: "B", level: "high" },
    ],
    comment:
      'かつての栄光は影を潜め<br><span class="hl">時間と健康</span>だけが残った。<br>孤独だが体は動く。<br>次の一手で<span class="hl">逆転</span>できる。',
    persona: {
      catchline: 'リストラされて<br><span class="hl">ハロワ通い</span>が日課のおじさん',
      description: '元大企業勤めだが<span class="hl">リストラ</span>されて<br>プライドだけ残った。<br>毎朝ジョギングして体は元気。<br>でも話す相手は<span class="hl">図書館の受付</span>だけ。',
      quote: '名刺を失ったら誰も寄ってこなくなった',
    },
  },
  PFCS: {
    code: "PFCS",
    name: "ナマケモノ",
    world: "海の世界",
    worldIcon: "🌊",
    worldColor: "#1B6B93",
    filename: "PFCS_namakemono",
    stats: [
      { label: "資産", pct: 25, rank: "D", level: "low" },
      { label: "収入", pct: 22, rank: "E", level: "low" },
      { label: "人間関係", pct: 72, rank: "B", level: "high" },
      { label: "時間", pct: 88, rank: "S", level: "high" },
      { label: "健康", pct: 28, rank: "D", level: "low" },
    ],
    comment:
      'ゆっくり生きることを<br><span class="hl">選んだ</span>からこそ見えるものがある。<br>仲間はいるが<span class="hl">体</span>がついてこない。<br>健康だけが足りない。',
    persona: {
      catchline: 'バイト週3で<br><span class="hl">カップ麺</span>が主食のフリーター',
      description: '友達とは毎週遊ぶが<br>金がないので<span class="hl">公園集合</span>。<br>コンビニ飯とカップ麺で生活。<br>健康診断は<span class="hl">3年受けてない</span>。',
      quote: '自由に見えて体は悲鳴を上げている',
    },
  },
  PFLS: {
    code: "PFLS",
    name: "カタツムリ",
    world: "海の世界",
    worldIcon: "🌊",
    worldColor: "#1B6B93",
    filename: "PFLS_snail",
    stats: [
      { label: "資産", pct: 18, rank: "E", level: "low" },
      { label: "収入", pct: 15, rank: "F", level: "low" },
      { label: "人間関係", pct: 22, rank: "E", level: "low" },
      { label: "時間", pct: 90, rank: "S", level: "high" },
      { label: "健康", pct: 20, rank: "E", level: "low" },
    ],
    comment:
      '<span class="hl">時間</span>だけはたっぷりある。<br>殻の中は居心地がいい。<br>でもそろそろ<br><span class="hl">外の世界</span>に顔を出してみては。',
    persona: {
      catchline: '親の家で<span class="hl">ゲームしてるだけ</span>の<br>完全引きこもり',
      description: '起きる時間は毎日違う。<br>食事は親が作ったものか<span class="hl">冷凍食品</span>。<br>友達はオンラインのフレンドだけ。<br>外出は<span class="hl">月1のコンビニ</span>。体重は毎年増える。',
      quote: '殻の中は居心地がいいが出口がない',
    },
  },
  MBCH: {
    code: "MBCH",
    name: "ドワーフの王",
    world: "地上の世界",
    worldIcon: "🌿",
    worldColor: "#7B6C3E",
    filename: "MBCH_dwarf_king",
    stats: [
      { label: "資産", pct: 85, rank: "A", level: "high" },
      { label: "収入", pct: 80, rank: "A", level: "high" },
      { label: "人間関係", pct: 72, rank: "B", level: "high" },
      { label: "時間", pct: 30, rank: "D", level: "low" },
      { label: "健康", pct: 75, rank: "B", level: "high" },
    ],
    comment:
      'お金も健康も人間関係も完璧。<br>でも<span class="hl">「時間」</span>だけが足りない。<br>あと一つ手に入れれば、<br>あなたは<span class="hl">頂点</span>に立てる。',
    persona: {
      catchline: '年収1000万だが<br><span class="hl">有給を使ったことがない</span>',
      description: 'Googleカレンダーは<span class="hl">色で埋め尽くされている</span>。<br>家族サービスも「予定」として管理。<br>子供の運動会を<span class="hl">Zoom</span>で見たことがある。<br>土日も社用携帯が鳴る。',
      quote: 'あと時間さえあれば完璧な王',
    },
  },
  MBLH: {
    code: "MBLH",
    name: "騎士",
    world: "地上の世界",
    worldIcon: "🌿",
    worldColor: "#7B6C3E",
    filename: "MBLH_knight",
    stats: [
      { label: "資産", pct: 78, rank: "A", level: "high" },
      { label: "収入", pct: 75, rank: "B", level: "high" },
      { label: "人間関係", pct: 28, rank: "D", level: "low" },
      { label: "時間", pct: 25, rank: "D", level: "low" },
      { label: "健康", pct: 76, rank: "B", level: "high" },
    ],
    comment:
      '誰かのために<span class="hl">剣</span>を振るい続ける勇者。<br>お金も健康も申し分ない。<br>そろそろ自分のための<br><span class="hl">時間</span>を作りませんか。',
    persona: {
      catchline: '毎日<span class="hl">終電</span>で<br>友達と会う暇もない独身',
      description: '冷蔵庫の中は<span class="hl">プロテインと水</span>だけ。<br>休日は一人でジム。<br>LINEの友達一覧は会社の同僚だけ。<br><span class="hl">Tinder</span>は写真を設定して放置。',
      quote: '剣を振るい続けるが称える者がいない',
    },
  },
  MBCS: {
    code: "MBCS",
    name: "タヌキ",
    world: "地上の世界",
    worldIcon: "🌿",
    worldColor: "#7B6C3E",
    filename: "MBCS_tanuki",
    stats: [
      { label: "資産", pct: 78, rank: "A", level: "high" },
      { label: "収入", pct: 76, rank: "B", level: "high" },
      { label: "人間関係", pct: 72, rank: "B", level: "high" },
      { label: "時間", pct: 22, rank: "E", level: "low" },
      { label: "健康", pct: 25, rank: "D", level: "low" },
    ],
    comment:
      '要領よく生きてきたはずが<br>大切なものと<span class="hl">すり替わって</span>いた。<br>健康か人間関係を<br><span class="hl">犠牲</span>にしていませんか。',
    persona: {
      catchline: '飲み会で<span class="hl">ビール腹</span>を育てる<br>管理職',
      description: '接待と飲み会で<span class="hl">週4外食</span>。<br>健康診断は毎年「要再検査」。<br>でも後輩には慕われている。<br><span class="hl">タクシー帰り</span>が月10回。家は寝るだけ。',
      quote: '出世はしたが体の借金が溜まっている',
    },
  },
  MBLS: {
    code: "MBLS",
    name: "フンコロガシ",
    world: "地上の世界",
    worldIcon: "🌿",
    worldColor: "#7B6C3E",
    filename: "MBLS_beetle",
    stats: [
      { label: "資産", pct: 82, rank: "A", level: "high" },
      { label: "収入", pct: 80, rank: "A", level: "high" },
      { label: "人間関係", pct: 20, rank: "E", level: "low" },
      { label: "時間", pct: 18, rank: "E", level: "low" },
      { label: "健康", pct: 22, rank: "E", level: "low" },
    ],
    comment:
      '<span class="hl">お金</span>だけが積み上がり<br>時間も健康も消えていた。<br>何のために稼いできたか<br>一度<span class="hl">立ち止まって</span>みては。',
    persona: {
      catchline: '通帳の数字だけ増えて<br><span class="hl">他は全部失った</span>タイプ',
      description: '朝5時起き深夜2時就寝。<br>食事は<span class="hl">コンビニおにぎり</span>。<br>最後に友達と会ったのは<span class="hl">3年前の結婚式</span>。<br>体調不良は栄養ドリンクで誤魔化す。',
      quote: '何のために稼いでいるのか自分でもわからない',
    },
  },
  PBCH: {
    code: "PBCH",
    name: "オークの族長",
    world: "闇の世界",
    worldIcon: "💀",
    worldColor: "#6B4E3D",
    filename: "PBCH_goblin_king",
    stats: [
      { label: "資産", pct: 22, rank: "E", level: "low" },
      { label: "収入", pct: 25, rank: "D", level: "low" },
      { label: "人間関係", pct: 75, rank: "B", level: "high" },
      { label: "時間", pct: 20, rank: "E", level: "low" },
      { label: "健康", pct: 76, rank: "B", level: "high" },
    ],
    comment:
      'お金はギリギリだが<br><span class="hl">健康と仲間</span>は守り続けている。<br>貧しくても今日も笑える。<br>それは本当の<span class="hl">豊かさ</span>かも。',
    persona: {
      catchline: '給料日前は<span class="hl">もやし生活</span>だが<br>仲間だけは多い',
      description: '地元の仲間と毎週集まって<br><span class="hl">BBQか居酒屋</span>。<br>金は全部飲み代に消える。<br>でも困った時に駆けつけてくれる<br><span class="hl">友達が5人</span>いる。健康だけが取り柄。',
      quote: '貧しくても今日も誰かと笑える',
    },
  },
  PBLH: {
    code: "PBLH",
    name: "流れ者",
    world: "闇の世界",
    worldIcon: "💀",
    worldColor: "#6B4E3D",
    filename: "PBLH_wanderer",
    stats: [
      { label: "資産", pct: 15, rank: "F", level: "low" },
      { label: "収入", pct: 18, rank: "E", level: "low" },
      { label: "人間関係", pct: 20, rank: "E", level: "low" },
      { label: "時間", pct: 15, rank: "F", level: "low" },
      { label: "健康", pct: 78, rank: "A", level: "high" },
    ],
    comment:
      '荷物を持たないからこそ<br><span class="hl">どこへでも</span>行ける。<br>健康な体一つで生きる<br>その身軽さが<span class="hl">武器</span>になる。',
    persona: {
      catchline: '住所不定で<span class="hl">日雇い</span>で<br>食いつないでるタイプ',
      description: '<span class="hl">ネカフェ</span>か友達の家を転々。<br>持ち物はリュック一つ。<br>でも体だけは丈夫。<br>スマホは<span class="hl">格安SIM</span>の最安プラン。',
      quote: '荷物がないから身軽だと言い聞かせている',
    },
  },
  PBCS: {
    code: "PBCS",
    name: "ハイエナ",
    world: "闇の世界",
    worldIcon: "💀",
    worldColor: "#6B4E3D",
    filename: "PBCS_hyena",
    stats: [
      { label: "資産", pct: 18, rank: "E", level: "low" },
      { label: "収入", pct: 20, rank: "E", level: "low" },
      { label: "人間関係", pct: 72, rank: "B", level: "high" },
      { label: "時間", pct: 18, rank: "E", level: "low" },
      { label: "健康", pct: 25, rank: "D", level: "low" },
    ],
    comment:
      'お金も時間も健康も消えた。<br>でも<span class="hl">仲間</span>だけは残っている。<br>その<span class="hl">粘り強さ</span>と絆が<br>逆転の武器になる。',
    persona: {
      catchline: '借金まみれだが<br><span class="hl">飲み友達</span>だけは来てくれる',
      description: '<span class="hl">消費者金融</span>の返済で給料は消える。<br>体もガタがきている。<br>でも毎週金曜は友達と<span class="hl">安い居酒屋</span>。<br>「俺もう終わりだわw」が口癖。でも笑ってる。',
      quote: '終わってるのに笑えるのは仲間がいるから',
    },
  },
  PBLS: {
    code: "PBLS",
    name: "蚊",
    world: "闇の世界",
    worldIcon: "💀",
    worldColor: "#6B4E3D",
    filename: "PBLS_mosquito",
    stats: [
      { label: "資産", pct: 10, rank: "F", level: "low" },
      { label: "収入", pct: 12, rank: "F", level: "low" },
      { label: "人間関係", pct: 15, rank: "F", level: "low" },
      { label: "時間", pct: 12, rank: "F", level: "low" },
      { label: "健康", pct: 18, rank: "E", level: "low" },
    ],
    comment:
      'すべてが底をついた。<br>それでも<span class="hl">今日も生きている</span>。<br>あなたにはまだ可能性がある。<br>ここからが<span class="hl">本当のスタート</span>。',
    persona: {
      catchline: '<span class="hl">全部ない</span>のに<br>今日も生きているタイプ',
      description: 'コンビニの<span class="hl">イートイン</span>で時間を潰す。<br>服は3年同じ。体は限界。<br>友達の連絡先は全部<span class="hl">ブロック</span>された。<br>でも今日もなぜか目が覚めた。',
      quote: '生きているだけでまだ可能性がある',
    },
  },
};

// ============================================================
// 動画プリセット定義
// ============================================================
const PRESETS = {
  kachigumi: {
    name: "勝ち組人生タイプ3選",
    theme: "orange",
    coverTitle: "勝ち組人生タイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFCH", "MBCH", "MFCH"],
    cardCodes: ["PFCH", "MBCH", "MFCH"],
    script: `人生勝ち組タイプ3選

第3位 ツクヨミ
お金はないが圧倒的に時間があるタイプ。
実家ぐらしのニートか、旦那の金で遊ぶ主婦が該当する。

第2位 ドワーフの王
家族や友人にも恵まれており高収入。
平日、土日ともにプライベートと仕事の予定で、時間に追われていることが多い。

第1位 イカロス
時間もお金も手に入れた圧倒的な強者。
サラリーマンは生きている世界が違うため会うことがない。
平日の昼間から犬の散歩をしている何をして稼いでいるのかわからないオジサンが該当する。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  bocchi: {
    name: "ぼっち人生タイプ3選",
    theme: "purple",
    coverTitle: "ぼっち人生タイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFLS", "MFLS", "MFLH"],
    cardCodes: ["PFLS", "MFLS", "MFLH"],
    script: `ぼっち人生タイプ3選

第3位 カタツムリ
時間だけはたっぷりある引きこもりタイプ。
殻の中は居心地がいいが、お金も人間関係もない。

第2位 カイコ
お金も時間もあるのに、世界から切り離されたタイプ。
豊かな繭の中でひとり。外の世界へ羽ばたく準備はできている。

第1位 孤独な大王
お金も時間も健康も揃っているのに、誰も隣にいない。
城はある、剣もある、でも宴を共にする者がいない。
一番もったいないぼっち。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  kanemochi_fukou: {
    name: "金持ちなのに不幸タイプ3選",
    theme: "green",
    coverTitle: "金持ちなのに不幸",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBLS", "MBCS", "MFCS"],
    cardCodes: ["MBLS", "MBCS", "MFCS"],
    script: `金持ちなのに不幸タイプ3選

第3位 フンコロガシ
お金だけが積み上がり、時間も健康も人間関係も消えたタイプ。
何のために稼いできたか、一度立ち止まって考えてみては。

第2位 タヌキ
要領よく稼いでいるが、健康か人間関係を犠牲にしてきたタイプ。
大切なものといつの間にかすり替わっていませんか。

第1位 スフィンクス
お金も時間も仲間も揃っているのに、体だけが悲鳴を上げているタイプ。
全てを手にしたのに肉体は有限。一番もったいない不幸。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  teihen: {
    name: "底辺から逆転タイプ3選",
    theme: "red",
    coverTitle: "底辺から逆転タイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBLS", "PBCS", "PBLH"],
    cardCodes: ["PBLS", "PBCS", "PBLH"],
    script: `底辺から逆転タイプ3選

第3位 蚊
すべてが底をついたタイプ。
それでも今日も生きている。ここからが本当のスタート。

第2位 ハイエナ
お金も時間も健康も消えたが、仲間だけは残っているタイプ。
その粘り強さと人間関係が逆転の武器になる。

第1位 流れ者
健康な体一つで生きているタイプ。
荷物を持たないからこそ、どこへでも行ける。
その身軽さが次の物語の始まりかもしれない。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  jikan: {
    name: "時間だけはあるタイプ3選",
    theme: "blue",
    coverTitle: "時間だけはあるタイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFLS", "PFCS", "PFCH"],
    cardCodes: ["PFLS", "PFCS", "PFCH"],
    script: `時間だけはあるタイプ3選

第3位 カタツムリ
時間だけはたっぷりあるが、それ以外は何もないタイプ。
殻の中は居心地がいいが、そろそろ外の世界に顔を出してみては。

第2位 ナマケモノ
時間はあるがお金が足りず、健康か人間関係にも穴が空いているタイプ。
ゆっくり生きることを選んだからこそ見えるものがある。

第1位 ツクヨミ
労働の呪縛から解き放たれ、時間だけは誰より持っているタイプ。
お金より大切なものを、すでに手に入れている自由人。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  kenkou: {
    name: "健康だけが取り柄タイプ3選",
    theme: "green",
    coverTitle: "健康だけが取り柄",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBLH", "PBCH", "MBLH"],
    cardCodes: ["PBLH", "PBCH", "MBLH"],
    script: `健康だけが取り柄タイプ3選

第3位 流れ者
お金も時間も仲間も持たず、ただ健康な体一つで生きているタイプ。
荷物を持たないからこそ、どこへでも行ける身軽さが武器。

第2位 オークの族長
お金はギリギリだが健康と人間関係だけは守り続けているタイプ。
貧しくても今日も誰かと笑える。それは本当の豊かさかもしれない。

第1位 騎士
お金も健康も申し分ないが、時間も人間関係もないタイプ。
誰かのために剣を振るい続ける勇者。そろそろ自分の時間を。

あなたは何タイプ？
コメント欄で教えてね`,
  },

  // === 共感・あるある系 ===
  salaryman: {
    name: "サラリーマンに多いタイプ3選",
    theme: "orange",
    coverTitle: "サラリーマンに多い",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBLH", "MBCS", "MBCH"],
    cardCodes: ["MBLH", "MBCS", "MBCH"],
    script: `サラリーマンに多いタイプ3選

第3位 騎士
年収は高いが毎日終電で友達と会う暇もない。
会社の同僚としか話さない独身サラリーマンが該当する。

第2位 タヌキ
要領よく出世してきたが、健康診断は再検査だらけ。
忙しすぎて家族との関係も冷え切っている管理職が該当する。

第1位 ドワーフの王
家族にも恵まれ高収入だが、平日も土日も予定で埋まっている。
大企業の管理職に多いタイプ。あと時間さえあれば完璧。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  shufu: {
    name: "主婦に多いタイプ3選",
    theme: "purple",
    coverTitle: "主婦に多いタイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFCS", "PBCH", "PFCH"],
    cardCodes: ["PFCS", "PBCH", "PFCH"],
    script: `主婦に多いタイプ3選

第3位 ナマケモノ
バイト週3で暮らしていて友達も少なく健康にも無頓着。
でも焦りはない。マイペースに生きるフリーターが該当。

第2位 オークの族長
お金はギリギリだが健康と仲間だけは守り続けている。
地元の仲間と毎週BBQしている人望の厚い人が該当する。

第1位 ツクヨミ
お金はないが圧倒的に時間がある。
旦那の金で遊ぶ主婦が該当する。お金より大切なものをすでに手に入れている。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  freelance: {
    name: "フリーランスに多いタイプ3選",
    theme: "blue",
    coverTitle: "フリーランスに多い",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFLS", "MFLH", "MFCH"],
    cardCodes: ["MFLS", "MFLH", "MFCH"],
    script: `フリーランスに多いタイプ3選

第3位 カイコ
投資やFXで稼いでいるが友達ゼロで体もボロボロの引きこもり。
豊かな繭の中でひとり。外に出れば世界が変わる。

第2位 孤独な大王
高年収で時間もあるのに友達がいない。
離婚してタワマンに一人で住んでるIT社長が該当する。

第1位 イカロス
時間もお金も手に入れた圧倒的な強者。
平日の昼間から犬の散歩をしている何をして稼いでいるのかわからないオジサンが該当する。

あなたは何タイプ？
コメント欄で教えてね`,
  },

  // === 対比・煽り系 ===
  shiawase: {
    name: "実は幸せなタイプ3選",
    theme: "green",
    coverTitle: "実は幸せなタイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBCH", "PFCH", "MFCH"],
    cardCodes: ["PBCH", "PFCH", "MFCH"],
    script: `実は幸せなタイプ3選

第3位 オークの族長
お金はギリギリだが健康と仲間は守り続けている。
貧しくても今日も誰かと笑える。それは本当の豊かさかもしれない。

第2位 ツクヨミ
お金はないが圧倒的に時間がある。
お金より大切なものを、すでに手に入れている自由人。

第1位 イカロス
時間もお金も手に入れた圧倒的な強者。
全てを手にした者だけが見る景色がそこにある。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  fukou: {
    name: "実は不幸なタイプ3選",
    theme: "red",
    coverTitle: "実は不幸なタイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBLS", "MFLH", "MFCS"],
    cardCodes: ["MBLS", "MFLH", "MFCS"],
    script: `実は不幸なタイプ3選

第3位 フンコロガシ
お金だけが積み上がり、時間も健康も人間関係も消えた。
朝から晩まで仕事漬けで通帳の数字だけが増えていく。

第2位 孤独な大王
お金も時間も健康も揃っているのに誰もいない。
高年収のIT社長だが友達がいない。一番もったいない不幸。

第1位 スフィンクス
全てを手にしたのに体だけが悲鳴を上げている。
飲み会が多い経営者や運動不足の在宅ワーカーが該当する。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  gyakuten: {
    name: "逆転可能性が高いタイプ3選",
    theme: "orange",
    coverTitle: "逆転可能性が高い",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBCS", "PBLH", "PFLH"],
    cardCodes: ["PBCS", "PBLH", "PFLH"],
    script: `逆転可能性が高いタイプ3選

第3位 ハイエナ
全部失ったが仲間だけは残っている。
借金まみれで体もボロボロだが飲み友達だけは来てくれる。その人脈が武器。

第2位 流れ者
健康な体一つで何も持たずに生きている。
身軽さが最大の武器。どこへでも行ける可能性を持っている。

第1位 没落貴族
かつての栄光は消えたが時間と品格は残っている。
元大企業勤めだがリストラされた。でもプライドと暇がある。次の一手で逆転できる。

あなたは何タイプ？
コメント欄で教えてね`,
  },

  // === 世界別シリーズ ===
  sora: {
    name: "空の世界の住人3選",
    theme: "blue",
    coverTitle: "空の世界の住人",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFLS", "MFCS", "MFCH"],
    cardCodes: ["MFLS", "MFCS", "MFCH"],
    script: `空の世界の住人3選

第3位 カイコ
お金も時間もあるのに、世界から孤立している。
投資で稼いでいるが友達ゼロで体もボロボロの引きこもり。

第2位 スフィンクス
全てを手にしたのに体だけが壊れている。
飲み会が多い経営者や運動不足の在宅ワーカーが該当する。

第1位 イカロス
時間もお金も手に入れた圧倒的な強者。
空の世界の頂点に君臨する、全てを手にした者。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  umi: {
    name: "海の世界の住人3選",
    theme: "blue",
    coverTitle: "海の世界の住人",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFLS", "PFCS", "PFCH"],
    cardCodes: ["PFLS", "PFCS", "PFCH"],
    script: `海の世界の住人3選

第3位 カタツムリ
時間だけはたっぷりある完全引きこもり。
親の家でゲームしてるだけ。でも時間だけは無限にある。

第2位 ナマケモノ
バイト週3で暮らしていて友達も少なく健康にも無頓着。
マイペースに生きるフリーターが該当する。

第1位 ツクヨミ
お金はないが圧倒的に時間がある。
海の世界の頂点に立つ、時間の自由を手にした月の住人。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  chijou: {
    name: "地上の世界の住人3選",
    theme: "orange",
    coverTitle: "地上の世界の住人",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBLS", "MBCS", "MBCH"],
    cardCodes: ["MBLS", "MBCS", "MBCH"],
    script: `地上の世界の住人3選

第3位 フンコロガシ
お金だけが積み上がり、時間も健康も人間関係も消えた。
何のために稼いできたか、一度立ち止まって考えてみては。

第2位 タヌキ
要領よく出世してきたが健康診断は再検査だらけ。
忙しすぎて家族との関係も冷え切っている管理職。

第1位 ドワーフの王
家族にも恵まれ高収入。でも時間だけがない。
地上の世界の頂点に立つ、あと一歩で完璧な王。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  yami: {
    name: "闇の世界の住人3選",
    theme: "red",
    coverTitle: "闇の世界の住人",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBLS", "PBCS", "PBLH"],
    cardCodes: ["PBLS", "PBCS", "PBLH"],
    script: `闇の世界の住人3選

第3位 蚊
すべてが底をついたタイプ。
それでも今日も生きている。ここからが本当のスタート。

第2位 ハイエナ
全部失ったが仲間だけは残っている。
借金まみれだが飲み友達だけは来てくれる。

第1位 流れ者
健康な体一つで何も持たずに生きている。
闇の世界の頂点。身軽さが最大の武器。

あなたは何タイプ？
コメント欄で教えてね`,
  },

  // === 刺さるキーワード系 ===
  okane: {
    name: "お金持ちタイプ3選",
    theme: "green",
    coverTitle: "お金持ちタイプ",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBCS", "MBCH", "MFCH"],
    cardCodes: ["MBCS", "MBCH", "MFCH"],
    script: `お金持ちタイプ3選

第3位 タヌキ
要領よく稼いでいるが、健康か人間関係を犠牲にしてきた。
大切なものといつの間にかすり替わっていた。

第2位 ドワーフの王
家族にも恵まれ高収入。平日も土日も予定で埋まっている。
大企業の管理職に多い。あと時間さえあれば完璧。

第1位 イカロス
時間もお金も手に入れた圧倒的な強者。
サラリーマンは生きている世界が違うため会うことがない。

あなたは何タイプ？
コメント欄で教えてね`,
  },
  yarinaoshi: {
    name: "人生やり直したいタイプ3選",
    theme: "purple",
    coverTitle: "人生やり直したい",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PBLS", "MBLS", "MFLS"],
    cardCodes: ["PBLS", "MBLS", "MFLS"],
    script: `人生やり直したいタイプ3選

第3位 蚊
すべてが底をついた。金なし、時間なし、友達なし、健康もなし。
それでも今日も生きている。ここからが本当のスタート。

第2位 フンコロガシ
お金だけが積み上がり、時間も健康も人間関係も消えた。
何のために稼いできたか、一度立ち止まって考えてみては。

第1位 カイコ
お金も時間もあるのに世界から孤立している。
豊かな繭の中でひとり。繭を破れば世界が変わるのに。

あなたは何タイプ？
コメント欄で教えてね`,
  },

  // ============================================================
  // 格差シリーズ — 生活の切り口別
  // ============================================================

  // --- 1. 住まい格差 ---
  sumika: {
    name: "住まい格差3選",
    theme: "orange",
    coverTitle: "住まい格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MBCH", "PBLS"],
    cardCodes: ["PBLS", "MBCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '港区タワマン<br><span class="hl">最上階</span>に住んでいる',
        description: '家賃は<span class="hl">月150万</span>。<br>窓からはレインボーブリッジ。<br>犬の散歩はテラスで完結。<br>「家は<span class="hl">投資</span>だから」が口癖。',
        quote: '景色に毎月150万払える男',
      },
      MBCH: {
        catchline: '郊外の<span class="hl">4LDK</span>に<br>住宅ローン35年',
        description: '駅徒歩<span class="hl">15分</span>のマイホーム。<br>庭のBBQグリルだけ新品。<br>週末は芝刈りが日課。<br>「資産になるから」と自分に<span class="hl">言い聞かせる</span>。',
        quote: '家を買ったのか家に買われたのか',
      },
      PBLS: {
        catchline: '<span class="hl">ネカフェ</span>の<br>フラットシートが自宅',
        description: '住所は実家のまま。<br>荷物は<span class="hl">リュック1個</span>。<br>シャワーはネカフェの無料シャワー。<br>「ここ意外と<span class="hl">快適</span>」と言い聞かせる。',
        quote: '天井の低さに慣れてしまった',
      },
    },
    script: `住まい格差3選

第3位 蚊
ネカフェのフラットシートが自宅。
住所は実家のまま。荷物はリュック1個。「ここ意外と快適」と言い聞かせる。

第2位 ドワーフの王
郊外の4LDKに住宅ローン35年。
駅徒歩15分のマイホーム。庭のBBQグリルだけ新品。

第1位 イカロス
港区タワマン最上階。家賃月150万。
窓からレインボーブリッジが見える。「家は投資だから」が口癖。

あなたの住まいはどのレベル？
コメント欄で教えてね`,
  },

  // --- 2. ランチ格差 ---
  lunch: {
    name: "ランチ格差3選",
    theme: "green",
    coverTitle: "ランチ格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBCH", "PFCH", "PBLS"],
    cardCodes: ["MBCH", "PFCH", "PBLS"],
    personaOnly: false,
    personaOverrides: {
      MBCH: {
        catchline: '年収1000万なのに<br>ランチは<span class="hl">コンビニ弁当</span>',
        description: 'デスクで<span class="hl">15分</span>で食べてすぐ会議。<br>弁当の中身は毎日同じ幕の内。<br>味なんて覚えてない。<br>「<span class="hl">食べる時間</span>がもったいない」が口癖。',
        quote: '年収1000万のランチが500円',
      },
      PFCH: {
        catchline: '年収ゼロなのに<br><span class="hl">アフターヌーンティー</span>',
        description: 'ママ友と<span class="hl">ホテルのラウンジ</span>で3時間。<br>旦那のカードで支払い。<br>「これ映える〜」とインスタに投稿。<br>お会計は<span class="hl">1人6,000円</span>。',
        quote: '稼いでないのに一番いいもの食べてる',
      },
      PBLS: {
        catchline: 'ランチは<br>コンビニの<span class="hl">100円パン</span>',
        description: 'イートインで<span class="hl">水と一緒</span>に食べる。<br>たまにおにぎり1個追加で贅沢。<br>レジで値段を<span class="hl">暗算</span>してから並ぶ。<br>「腹が膨れればいい」。',
        quote: 'ランチ代は100円で十分',
      },
    },
    script: `ランチ格差3選

第3位 ドワーフの王
年収1000万なのにランチはコンビニ弁当。
デスクで15分で食べてすぐ会議。「食べる時間がもったいない」。

第2位 ツクヨミ
年収ゼロなのにママ友とアフターヌーンティー。
ホテルのラウンジで3時間。旦那のカードで支払い。

第1位 蚊
コンビニのイートインで100円パン。
レジで値段を暗算してから並ぶ。

年収と食事のレベルは比例しない！
コメント欄で教えてね`,
  },

  // --- 3. 移動手段格差 ---
  norimono: {
    name: "通勤・移動手段格差3選",
    theme: "blue",
    coverTitle: "移動手段格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MBLH", "PBLH"],
    cardCodes: ["PBLH", "MBLH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '移動は<br><span class="hl">ベンツSクラス</span>か<span class="hl">テスラ</span>',
        description: '「<span class="hl">電車？乗らないな</span>」が口癖。<br>駐車場代は月5万。<br>渋滞中もハンズフリーで商談。<br>ガソリン代という概念が<span class="hl">ない</span>。',
        quote: '満員電車という概念を知らない男',
      },
      MBLH: {
        catchline: '毎朝<span class="hl">満員電車</span>で<br>1時間揺られている',
        description: '朝6時半の<span class="hl">中央線</span>が戦場。<br>スマホすら取り出せない。<br>会社に着いた時点で<span class="hl">疲労度MAX</span>。<br>帰りの終電が一日のゴール。',
        quote: '人生の3分の1を電車で過ごしている',
      },
      PBLH: {
        catchline: '移動手段は<br><span class="hl">徒歩</span>のみ',
        description: '<span class="hl">電車賃</span>すら出せない。<br>片道2時間歩いて現場に行く。<br>靴底は<span class="hl">すり減って</span>穴が空いている。<br>雨の日は最悪。',
        quote: '交通費という贅沢品',
      },
    },
    script: `通勤・移動手段格差3選

第3位 流れ者
移動手段は徒歩のみ。電車賃すら出せない。
片道2時間歩いて現場に行く。靴底はすり減って穴が空いている。

第2位 騎士
毎朝満員電車で1時間揺られている。
スマホすら取り出せない。会社に着いた時点で疲労度MAX。

第1位 イカロス
移動はベンツSクラスかテスラ。
「電車？乗らないな」。満員電車という概念を知らない。

あなたの通勤手段は？
コメント欄で教えてね`,
  },

  // --- 4. 休日の過ごし方格差 ---
  kyujitsu: {
    name: "休日の過ごし方格差3選",
    theme: "purple",
    coverTitle: "休日の過ごし方格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PFLS", "MBLS"],
    cardCodes: ["MBLS", "PFLS", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '午前ゴルフ →<br>午後<span class="hl">表参道</span>で買い物',
        description: '朝は<span class="hl">ゴルフ仲間</span>とラウンド。<br>午後は表参道でショッピング。<br>夜は会員制バーで投資家と情報交換。<br>「<span class="hl">退屈</span>」が一番の敵。',
        quote: '休日の過ごし方にも格差がある',
      },
      PFLS: {
        catchline: '<span class="hl">ゲーム</span> → 昼寝 →<br><span class="hl">ゲーム</span>の無限ループ',
        description: '起きたら<span class="hl">15時</span>。<br>冷蔵庫を開けて閉める。<br>ゲームを起動してそのまま朝4時。<br>「今日は<span class="hl">充実してた</span>」と思い込む。',
        quote: '365日が休日だと休日の価値がない',
      },
      MBLS: {
        catchline: '休日？<br><span class="hl">そんなもの存在しない</span>',
        description: '土曜も日曜も<span class="hl">出勤</span>。<br>カレンダーの赤い日は知らない。<br>「今月もう30連勤だわ」。<br>通帳の数字だけが<span class="hl">唯一の報酬</span>。',
        quote: '稼いでも使う日がない',
      },
    },
    script: `休日の過ごし方格差3選

第3位 フンコロガシ
休日？そんなもの存在しない。
土曜も日曜も出勤。通帳の数字だけが唯一の報酬。

第2位 カタツムリ
ゲーム→昼寝→ゲームの無限ループ。
起きたら15時。そのまま朝4時までゲーム。

第1位 イカロス
午前ゴルフ→午後表参道→夜は会員制バー。
「退屈」が一番の敵という贅沢な悩み。

あなたの休日はどれ？
コメント欄で教えてね`,
  },

  // --- 5. 朝のルーティン格差 ---
  asa: {
    name: "朝のルーティン格差3選",
    theme: "orange",
    coverTitle: "朝のルーティン格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MBLH", "PFLS"],
    cardCodes: ["PFLS", "MBLH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '6時起き → <span class="hl">ジム</span> →<br>カフェで<span class="hl">MacBook</span>',
        description: '朝は<span class="hl">パーソナルジム</span>で1時間。<br>その後テラスカフェでコーヒー。<br>MacBookを開いて<span class="hl">投資チェック</span>。<br>満員電車？何それ？',
        quote: '朝の過ごし方で人生の格差が決まる',
      },
      MBLH: {
        catchline: '5時起き → <span class="hl">満員電車</span> →<br>デスクに直行',
        description: '目覚ましが鳴る前に<span class="hl">目が覚める</span>。<br>朝食はコンビニのおにぎり。<br>電車で立ったまま<span class="hl">メール返信</span>。<br>会社に着いた時点で一日の体力の半分消耗。',
        quote: '朝の時点で疲れている男',
      },
      PFLS: {
        catchline: '<span class="hl">午後3時</span>に目覚める<br>それが「朝」',
        description: '目覚ましは<span class="hl">セットしない主義</span>。<br>起きたらまず冷蔵庫。<br>親が作った朝昼兼用ご飯を食べる。<br>そのまま<span class="hl">ゲーム起動</span>。',
        quote: '朝という概念がそもそもない',
      },
    },
    script: `朝のルーティン格差3選

第3位 カタツムリ
午後3時に目覚める。それが「朝」。
目覚ましはセットしない主義。起きたらゲーム起動。

第2位 騎士
5時起き→満員電車→デスクに直行。
会社に着いた時点で体力の半分消耗。

第1位 イカロス
6時起き→パーソナルジム→テラスカフェでMacBook。
満員電車？何それ？

あなたの朝はどれ？
コメント欄で教えてね`,
  },

  // --- 6. 夜の過ごし方格差 ---
  yoru: {
    name: "夜の過ごし方格差3選",
    theme: "red",
    coverTitle: "夜の過ごし方格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MFLH", "MBLS"],
    cardCodes: ["MBLS", "MFLH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '夜は<span class="hl">会員制バー</span>で<br>投資家仲間と情報交換',
        description: '入会金<span class="hl">50万</span>のバー。<br>カウンターで飲むウイスキーは1杯5000円。<br>話題は不動産と為替。<br>「明日の朝は<span class="hl">ジム</span>だから2杯まで」。',
        quote: '夜の付き合いが翌朝の資産を作る',
      },
      MFLH: {
        catchline: '暗い部屋で<br><span class="hl">一人Netflix</span>',
        description: '話し相手は<span class="hl">ChatGPT</span>だけ。<br>Netflixのレコメンドが自分を一番理解してる。<br>UberEatsの通知だけが<span class="hl">人との接点</span>。<br>「今日も誰とも話してない」。',
        quote: '画面の光だけが友達',
      },
      MBLS: {
        catchline: '夜は<span class="hl">深夜2時</span>まで<br>オフィスで残業',
        description: 'デスクの<span class="hl">栄養ドリンク</span>が3本目。<br>コンビニ弁当の空き箱が積まれている。<br>終電はとっくに終わった。<br>「明日も<span class="hl">5時起き</span>」。',
        quote: '夜が来ても仕事が終わらない',
      },
    },
    script: `夜の過ごし方格差3選

第3位 フンコロガシ
深夜2時までオフィスで残業。栄養ドリンク3本目。
終電はとっくに終わった。明日も5時起き。

第2位 孤独な大王
暗い部屋で一人Netflix。話し相手はChatGPTだけ。
UberEatsの通知だけが人との接点。

第1位 イカロス
会員制バーで投資家仲間と情報交換。
ウイスキー1杯5000円。「明日の朝はジムだから2杯まで」。

あなたの夜はどれ？
コメント欄で教えてね`,
  },

  // --- 7. スマホ格差 ---
  sumaho: {
    name: "スマホ格差3選",
    theme: "blue",
    coverTitle: "スマホ格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PFLS", "PBLS"],
    cardCodes: ["PBLS", "PFLS", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '<span class="hl">iPhone最新</span> +<br>Apple Watch Ultra',
        description: 'AirPods Maxで<span class="hl">ノイキャン</span>。<br>iPhoneは毎年買い替え。<br>ストレージは<span class="hl">1TB</span>。<br>「容量気にしたことない」。',
        quote: 'スマホに30万かけても痛くない',
      },
      PFLS: {
        catchline: '親のお下がりの<br><span class="hl">iPhone</span>',
        description: 'Wi-Fiでしか使えない。<br>ストレージは<span class="hl">パンパン</span>。<br>アプリ入れるたびに写真を消す。<br>外ではフリーWi-Fiスポットを<span class="hl">探す</span>旅。',
        quote: 'ギガという概念に支配されている',
      },
      PBLS: {
        catchline: '画面<span class="hl">バキバキ</span>の<br>Android',
        description: '充電は<span class="hl">図書館のコンセント</span>。<br>格安SIMの最安プラン<span class="hl">1GB</span>。<br>月末は通信制限で何もできない。<br>画面の割れ目から指を切った。',
        quote: '画面が割れても直す金がない',
      },
    },
    script: `スマホ格差3選

第3位 蚊
画面バキバキのAndroid。充電は図書館のコンセント。
格安SIMの1GB。月末は通信制限で何もできない。

第2位 カタツムリ
親のお下がりのiPhone。Wi-Fiでしか使えない。
外ではフリーWi-Fiスポットを探す旅。

第1位 イカロス
iPhone最新+Apple Watch Ultra+AirPods Max。
ストレージ1TB。「容量気にしたことない」。

あなたのスマホは？
コメント欄で教えてね`,
  },

  // --- 8. 貯金額格差 ---
  chokin: {
    name: "貯金額格差3選",
    theme: "green",
    coverTitle: "貯金額格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PFCH", "PBLS"],
    cardCodes: ["PBLS", "PFCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '貯金<span class="hl">1億円</span><br>+不動産+投資信託',
        description: '「<span class="hl">通帳？見ないな</span>」が口癖。<br>資産管理は専属の<span class="hl">FP</span>に任せてる。<br>銀行口座は5つ。<br>利息だけで<span class="hl">年収超える</span>人もいる。',
        quote: '通帳を見る必要がない世界',
      },
      PFCH: {
        catchline: '貯金<span class="hl">0円</span><br>でも何も困ってない',
        description: '旦那の口座に<span class="hl">全部ある</span>から。<br>自分名義の口座は残高<span class="hl">3万円</span>。<br>「お金の概念がない」。<br>クレジットカードは<span class="hl">旦那の家族カード</span>。',
        quote: '自分の金じゃないから減らない',
      },
      PBLS: {
        catchline: '貯金<span class="hl">マイナス</span><br>借金だけがある',
        description: '消費者金融の<span class="hl">返済</span>が毎月。<br>財布の中は<span class="hl">小銭だけ</span>。<br>ATMの残高照会が怖い。<br>「<span class="hl">来月こそ</span>返す」が口癖。',
        quote: '通帳を見るのが怖い世界',
      },
    },
    script: `貯金額格差3選

第3位 蚊
貯金マイナス。借金だけがある。
ATMの残高照会が怖い。「来月こそ返す」。

第2位 ツクヨミ
貯金0円。でも何も困ってない。
旦那の口座に全部あるから。自分の金じゃないから減らない。

第1位 イカロス
貯金1億円+不動産+投資信託。
「通帳？見ないな」。利息だけで年収超える。

あなたの貯金額は？
コメント欄で教えてね`,
  },

  // --- 9. ファッション格差 ---
  fashion_kakusa: {
    name: "ファッション格差3選",
    theme: "purple",
    coverTitle: "ファッション格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MBLH", "PFLS"],
    cardCodes: ["PFLS", "MBLH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: 'クローゼットに<br><span class="hl">エルメス</span>と<span class="hl">ロレックス</span>',
        description: '時計は<span class="hl">デイトナ</span>。<br>でも普段はTシャツとジーパン。<br>「<span class="hl">本物</span>を知ってる人にはわかる」。<br>靴だけは<span class="hl">ジョンロブ</span>。',
        quote: '金持ちほど服に興味がない',
      },
      MBLH: {
        catchline: '全身<span class="hl">ユニクロ</span><br>+ジムウェア',
        description: '私服は<span class="hl">5パターン</span>のローテ。<br>全部ユニクロのオンラインで購入。<br>「<span class="hl">機能性</span>が大事」が口癖。<br>おしゃれする相手が<span class="hl">いない</span>。',
        quote: '服を選ぶ時間すらもったいない',
      },
      PFLS: {
        catchline: '<span class="hl">中学の時</span>のジャージを<br>まだ着ている',
        description: '外に出ないから<span class="hl">着替える必要がない</span>。<br>服は3年間同じ。<br>靴は<span class="hl">1足</span>だけ。<br>鏡を最後に見たのは先月。',
        quote: '誰にも見られないから何でもいい',
      },
    },
    script: `ファッション格差3選

第3位 カタツムリ
中学の時のジャージをまだ着ている。
外に出ないから着替える必要がない。服は3年同じ。

第2位 騎士
全身ユニクロ+ジムウェア。私服は5パターン。
「機能性が大事」が口癖。おしゃれする相手がいない。

第1位 イカロス
クローゼットにエルメスとロレックス。
でも普段はTシャツとジーパン。「本物を知ってる人にはわかる」。

あなたのファッションは？
コメント欄で教えてね`,
  },

  // --- 10. 年末年始格差 ---
  nenmatsu: {
    name: "年末年始の過ごし方格差3選",
    theme: "red",
    coverTitle: "年末年始格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MBCH", "PBLS"],
    cardCodes: ["PBLS", "MBCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '年末年始は<br><span class="hl">ハワイ</span>で過ごす',
        description: 'ビジネスクラスで<span class="hl">ホノルル</span>へ。<br>ワイキキのスイートルームで年越し。<br>初日の出は<span class="hl">ダイヤモンドヘッド</span>。<br>インスタは海の写真だらけ。',
        quote: '寒い日本で年越しする理由がない',
      },
      MBCH: {
        catchline: '年末年始は<br><span class="hl">実家で親孝行</span>',
        description: '新幹線の指定席で<span class="hl">帰省</span>。<br>実家で母親の料理を食べる。<br>子供たちに<span class="hl">お年玉</span>を配る。<br>仕事のメールは「<span class="hl">見ない</span>」と決めた。',
        quote: '年に一度の強制リセット',
      },
      PBLS: {
        catchline: '年末年始は<br><span class="hl">ネカフェ</span>で年越し',
        description: '<span class="hl">カウントダウン</span>はネカフェのテレビで見た。<br>正月は炊き出しに<span class="hl">並ぶ</span>。<br>年賀状は誰にも出さない。<br>「<span class="hl">去年と何も変わらない</span>」。',
        quote: '正月も平日も同じ天井',
      },
    },
    script: `年末年始の過ごし方格差3選

第3位 蚊
ネカフェで年越し。カウントダウンはテレビで見た。
正月は炊き出しに並ぶ。「去年と何も変わらない」。

第2位 ドワーフの王
新幹線で実家へ帰省。母親の料理を食べる。
仕事のメールは「見ない」と決めた年に一度の強制リセット。

第1位 イカロス
年末年始はハワイで過ごす。
ワイキキのスイートルームで年越し。初日の出はダイヤモンドヘッド。

あなたの年末年始は？
コメント欄で教えてね`,
  },

  // --- 11. デート格差 ---
  date_kakusa: {
    name: "デート格差3選",
    theme: "purple",
    coverTitle: "デート格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PBCH", "PFLS"],
    cardCodes: ["PFLS", "PBCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: 'デートは<br><span class="hl">完全予約制フレンチ</span>',
        description: '紀尾井町の<span class="hl">隠れ家レストラン</span>。<br>コース料理は1人<span class="hl">5万円</span>。<br>ワインはソムリエにお任せ。<br>「次はどこ<span class="hl">連れてって</span>くれるの？」',
        quote: 'デートの予算に上限がない',
      },
      PBCH: {
        catchline: 'デートは<br>嫁の<span class="hl">手料理</span>が最強',
        description: '金がないから外食は<span class="hl">月1回</span>。<br>でも嫁の手料理が一番うまい。<br>子供と3人で<span class="hl">公園</span>が休日の定番。<br>「<span class="hl">幸せ</span>はここにある」。',
        quote: '金がなくても愛があれば十分',
      },
      PFLS: {
        catchline: '<span class="hl">デート</span>したことが<br>そもそもない',
        description: '異性と最後に話したのは<br><span class="hl">コンビニの店員</span>。<br>マッチングアプリは<span class="hl">写真</span>で諦めた。<br>「2次元で十分」が自分への<span class="hl">言い訳</span>。',
        quote: 'デートという概念がフィクション',
      },
    },
    script: `デート格差3選

第3位 カタツムリ
デートしたことがそもそもない。
異性と最後に話したのはコンビニの店員。「2次元で十分」。

第2位 オークの族長
デートは嫁の手料理が最強。
金がないから外食は月1回。でも「幸せはここにある」。

第1位 イカロス
デートは完全予約制フレンチ。コース1人5万円。
「次はどこ連れてってくれるの？」

あなたのデートは？
コメント欄で教えてね`,
  },

  // --- 12. 飲み会格差 ---
  nomikai: {
    name: "飲み会格差3選",
    theme: "orange",
    coverTitle: "飲み会格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PBCH", "PBLS"],
    cardCodes: ["PBLS", "PBCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '飲みは<br><span class="hl">銀座の会員制クラブ</span>',
        description: 'ボトルキープは<span class="hl">マッカラン30年</span>。<br>一晩で<span class="hl">10万円</span>使っても経費。<br>相手は経営者仲間だけ。<br>「ここの<span class="hl">ママ</span>は話が分かる」。',
        quote: '飲み代が経費で落ちる世界',
      },
      PBCH: {
        catchline: '地元の<span class="hl">安い居酒屋</span>で<br>仲間と乾杯',
        description: '一人<span class="hl">2000円</span>の飲み放題。<br>毎週金曜は同じメンバー。<br>話題は昔話と愚痴。<br>でも<span class="hl">腹を割って</span>話せる仲間がいる。',
        quote: '2000円で買える最高の幸せ',
      },
      PBLS: {
        catchline: '一人で<br>公園のベンチで<span class="hl">缶チューハイ</span>',
        description: 'コンビニの<span class="hl">ストロングゼロ</span>が相棒。<br>飲み仲間はいない。<br>話し相手は<span class="hl">自分</span>だけ。<br>「500円で酔えるから<span class="hl">コスパ最強</span>」。',
        quote: '孤独のストロングゼロ',
      },
    },
    script: `飲み会格差3選

第3位 蚊
一人で公園のベンチで缶チューハイ。
話し相手は自分だけ。「500円で酔えるからコスパ最強」。

第2位 オークの族長
地元の安い居酒屋で仲間と乾杯。一人2000円の飲み放題。
毎週金曜は同じメンバー。2000円で買える最高の幸せ。

第1位 イカロス
銀座の会員制クラブ。ボトルキープはマッカラン30年。
一晩10万円使っても経費。「ここのママは話が分かる」。

あなたの飲み会は？
コメント欄で教えてね`,
  },

  // --- 13. 健康管理格差 ---
  kenkou_kakusa: {
    name: "健康管理格差3選",
    theme: "green",
    coverTitle: "健康管理格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "MFCS", "PBCH"],
    cardCodes: ["MFCS", "PBCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: '月額<span class="hl">20万</span>の<br>パーソナルジム',
        description: '専属トレーナーが<span class="hl">食事管理</span>まで。<br>サプリは<span class="hl">海外直輸入</span>。<br>人間ドックは年2回。<br>体脂肪率は<span class="hl">12%</span>をキープ。',
        quote: '健康は最高の投資',
      },
      MFCS: {
        catchline: '金はあるのに<br>健康診断は<span class="hl">オールC</span>',
        description: '毎晩接待で<span class="hl">酒を浴びる</span>。<br>運動は駅の階段だけ。<br>人間ドックの結果は<span class="hl">見て見ぬふり</span>。<br>ジムの会費だけ払って<span class="hl">1回も行ってない</span>。',
        quote: '金で健康は買えなかった',
      },
      PBCH: {
        catchline: '金はないが<br><span class="hl">毎朝ラジオ体操</span>',
        description: '地元の公園で<span class="hl">朝6時</span>集合。<br>仲間と一緒に体を動かす。<br>週末は<span class="hl">草野球</span>。<br>健康診断は<span class="hl">オールA</span>。金はないが体は元気。',
        quote: '金がなくても体は裏切らない',
      },
    },
    script: `健康管理格差3選

第3位 スフィンクス
金はあるのに健康診断はオールC。
毎晩接待で酒を浴びる。ジムの会費だけ払って1回も行ってない。

第2位 オークの族長
金はないが毎朝ラジオ体操。
地元の公園で朝6時集合。健康診断はオールA。

第1位 イカロス
月額20万のパーソナルジム。専属トレーナーが食事管理まで。
体脂肪率12%キープ。「健康は最高の投資」。

健康と金は比例しない！
コメント欄で教えてね`,
  },

  // --- 14. ストレス解消格差 ---
  stress: {
    name: "ストレス解消法格差3選",
    theme: "blue",
    coverTitle: "ストレス解消格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PFCH", "MBLS"],
    cardCodes: ["MBLS", "PFCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: 'ストレス解消は<br><span class="hl">海外旅行</span>',
        description: '月1で<span class="hl">バリ島</span>か<span class="hl">ドバイ</span>。<br>ファーストクラスで移動。<br>スパで1日過ごして復活。<br>「<span class="hl">環境</span>を変えれば気分も変わる」。',
        quote: 'ストレスを金で消す男',
      },
      PFCH: {
        catchline: 'ストレス解消は<br><span class="hl">エステ</span>と<span class="hl">買い物</span>',
        description: '週1で<span class="hl">フェイシャルエステ</span>。<br>ストレスが溜まったら<span class="hl">ショッピング</span>。<br>旦那のカードで買い物して<br>「<span class="hl">自分へのご褒美</span>」と言い訳。',
        quote: 'ストレスを旦那の金で消す女',
      },
      MBLS: {
        catchline: 'ストレス解消？<br><span class="hl">そんな暇がない</span>',
        description: '唯一の息抜きは<br>コンビニの<span class="hl">エナジードリンク</span>。<br>趣味を聞かれても答えられない。<br>「ストレスが<span class="hl">デフォルト</span>」。',
        quote: 'ストレスを感じる余裕すらない',
      },
    },
    script: `ストレス解消法格差3選

第3位 フンコロガシ
ストレス解消？そんな暇がない。
唯一の息抜きはコンビニのエナジードリンク。「ストレスがデフォルト」。

第2位 ツクヨミ
週1でフェイシャルエステ。ストレスが溜まったらショッピング。
旦那のカードで「自分へのご褒美」。

第1位 イカロス
月1でバリ島かドバイ。ファーストクラスで移動。
「環境を変えれば気分も変わる」。

あなたのストレス解消法は？
コメント欄で教えてね`,
  },

  // --- 15. SNS格差 ---
  sns_kakusa: {
    name: "SNS格差3選",
    theme: "purple",
    coverTitle: "SNS格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFCH", "PFCH", "PFLS"],
    cardCodes: ["PFLS", "PFCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MFCH: {
        catchline: 'インスタは<br><span class="hl">海外旅行</span>の写真ばかり',
        description: 'フォロワー<span class="hl">5万人</span>。<br>でも自分からは<span class="hl">いいね</span>しない。<br>ストーリーは上げない主義。<br>「<span class="hl">見せびらかす</span>のは下品」と言いつつ投稿。',
        quote: 'SNSすら余裕の投稿',
      },
      PFCH: {
        catchline: 'インスタの<span class="hl">ストーリー</span><br>毎日更新',
        description: 'ランチの写真に<span class="hl">位置情報</span>必須。<br>「#カフェ巡り」「#ママライフ」。<br>リールは<span class="hl">子供の動画</span>。<br>フォロワーの<span class="hl">半分はママ友</span>。',
        quote: '映えないものは食べない',
      },
      PFLS: {
        catchline: 'SNSの<span class="hl">アカウント</span>が<br>そもそもない',
        description: '最後にログインしたのは<span class="hl">3年前</span>。<br>誰かの投稿を見ると<span class="hl">病む</span>。<br>「リア充爆発しろ」が口癖。<br>唯一のSNSは<span class="hl">匿名掲示板</span>。',
        quote: 'SNSを見ると精神が削れる',
      },
    },
    script: `SNS格差3選

第3位 カタツムリ
SNSのアカウントがそもそもない。
最後にログインしたのは3年前。「リア充爆発しろ」が口癖。

第2位 ツクヨミ
インスタのストーリー毎日更新。ランチの写真に位置情報必須。
「#カフェ巡り」「#ママライフ」。映えないものは食べない。

第1位 イカロス
インスタは海外旅行の写真ばかり。フォロワー5万人。
「見せびらかすのは下品」と言いつつ投稿。

あなたのSNSは？
コメント欄で教えてね`,
  },

  // --- 16. 年収1000万の現実 ---
  nenshu1000: {
    name: "年収1000万の現実3選",
    theme: "orange",
    coverTitle: "年収1000万の現実",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBCH", "MBLH", "MBCS"],
    cardCodes: ["MBCS", "MBLH", "MBCH"],
    personaOnly: false,
    personaOverrides: {
      MBCH: {
        catchline: '年収1000万で<br><span class="hl">有給を使ったことがない</span>',
        description: 'Googleカレンダーは<span class="hl">色で埋め尽くされている</span>。<br>子供の運動会をZoomで見た。<br>旅行の計画は毎年<span class="hl">立てるだけ</span>。<br>「来年こそ休む」が5年目。',
        quote: '金はあるが使う時間がない',
      },
      MBLH: {
        catchline: '年収1000万で<br><span class="hl">友達ゼロ</span>',
        description: 'LINEの友達一覧は<span class="hl">会社の同僚だけ</span>。<br>休日は一人でジムか一人焼肉。<br>最後に友達と飲んだのは<span class="hl">3年前</span>。<br>Tinderは写真設定して<span class="hl">放置</span>。',
        quote: '稼いでも一緒に使う人がいない',
      },
      MBCS: {
        catchline: '年収1000万で<br>健康診断<span class="hl">全部再検査</span>',
        description: '接待で<span class="hl">週4外食</span>。<br>ビール腹が育っている。<br>タクシー帰りが月10回。<br>「<span class="hl">来月からジム</span>行く」が2年目。',
        quote: '出世と引き換えに体を壊した',
      },
    },
    script: `年収1000万の現実3選

第3位 タヌキ
年収1000万で健康診断全部再検査。
接待で週4外食。ビール腹が育っている。「来月からジム行く」が2年目。

第2位 騎士
年収1000万で友達ゼロ。
LINEの友達一覧は会社の同僚だけ。休日は一人ジムか一人焼肉。

第1位 ドワーフの王
年収1000万で有給を使ったことがない。
子供の運動会をZoomで見た。「来年こそ休む」が5年目。

年収1000万でも幸せとは限らない！
コメント欄で教えてね`,
  },

  // --- 17. 引きこもりの格差 ---
  hikikomori: {
    name: "引きこもりの格差3選",
    theme: "red",
    coverTitle: "引きこもりの格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFLS", "MFLH", "PFLS"],
    cardCodes: ["PFLS", "MFLH", "MFLS"],
    personaOnly: false,
    personaOverrides: {
      MFLS: {
        catchline: '引きこもりだが<br><span class="hl">資産1億</span>ある',
        description: '<span class="hl">投資とFX</span>で稼いでいる。<br>モニター4枚の部屋。<br>食事はUber Eatsと出前館。<br>「<span class="hl">外に出る理由</span>がない」。',
        quote: '繭の中で資産だけが増えていく',
      },
      MFLH: {
        catchline: '引きこもりだが<br><span class="hl">タワマン</span>住み',
        description: 'IT企業の<span class="hl">元CEO</span>。<br>友達は全員離れた。<br>UberEatsの配達員だけが人間関係。<br>「<span class="hl">金があっても寂しい</span>」。',
        quote: '広い部屋に一人は余計に寂しい',
      },
      PFLS: {
        catchline: '引きこもりで<br><span class="hl">金もない</span>',
        description: '実家の<span class="hl">6畳の部屋</span>が全世界。<br>食事は親が作ったもの。<br>友達はオンラインのフレンドだけ。<br>「<span class="hl">外が怖い</span>」。',
        quote: '殻の中から出る勇気がない',
      },
    },
    script: `引きこもりの格差3選

第3位 カタツムリ
引きこもりで金もない。実家の6畳の部屋が全世界。
食事は親任せ。友達はオンラインのフレンドだけ。

第2位 孤独な大王
引きこもりだがタワマン住み。IT企業の元CEO。
友達は全員離れた。「金があっても寂しい」。

第1位 カイコ
引きこもりだが資産1億。投資とFXで稼いでいる。
モニター4枚の部屋。「外に出る理由がない」。

同じ引きこもりでも全然違う！
コメント欄で教えてね`,
  },

  // --- 18. お金 vs 時間 ---
  kane_vs_jikan: {
    name: "お金と時間どっちが大事？3選",
    theme: "green",
    coverTitle: "お金vs時間",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MBLS", "PFCH", "MFCH"],
    cardCodes: ["MBLS", "PFCH", "MFCH"],
    personaOnly: false,
    personaOverrides: {
      MBLS: {
        catchline: '<span class="hl">金だけ</span>あって<br>時間が一切ない',
        description: '通帳の数字は<span class="hl">2000万</span>。<br>でも使う時間がない。<br>朝5時起き深夜2時就寝。<br>「<span class="hl">何のために</span>稼いでるか分からない」。',
        quote: '金を貯める機械になってしまった',
      },
      PFCH: {
        catchline: '<span class="hl">時間だけ</span>あって<br>金がない',
        description: '毎日<span class="hl">好きな時間</span>に起きる。<br>カフェでダラダラ3時間。<br>旦那の金で生きている。<br>「<span class="hl">自由</span>って最高」。',
        quote: '時間はあるが全て他人の金',
      },
      MFCH: {
        catchline: '<span class="hl">金も時間も</span><br>両方ある',
        description: '朝は<span class="hl">ジム</span>。昼は<span class="hl">カフェ</span>。<br>午後は趣味の時間。<br>夜は投資家仲間と食事。<br>「<span class="hl">仕組み</span>を作れば両立できる」。',
        quote: '金と時間の両方を手にした者',
      },
    },
    script: `お金と時間どっちが大事？3選

第3位 フンコロガシ
金だけあって時間が一切ない。通帳は2000万。
でも使う時間がない。「何のために稼いでるか分からない」。

第2位 ツクヨミ
時間だけあって金がない。毎日好きな時間に起きる。
旦那の金で生きている。「自由って最高」。

第1位 イカロス
金も時間も両方ある。朝はジム、昼はカフェ、夜は食事会。
「仕組みを作れば両立できる」。

あなたはどっち派？
コメント欄で教えてね`,
  },

  // --- 19. 貧乏メシ格差 ---
  binbo_meshi: {
    name: "貧乏メシ格差3選",
    theme: "red",
    coverTitle: "貧乏メシ格差",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["PFCS", "PBLH", "PBLS"],
    cardCodes: ["PFCS", "PBLH", "PBLS"],
    personaOnly: false,
    personaOverrides: {
      PFCS: {
        catchline: '主食は<br><span class="hl">カップ麺</span>',
        description: '味のバリエーションで<span class="hl">飽きない</span>。<br>お湯を沸かすのが唯一の調理。<br>月の食費は<span class="hl">1万5千円</span>。<br>「<span class="hl">新作</span>出ると嬉しい」。',
        quote: 'カップ麺のバリエーションが人生の楽しみ',
      },
      PBLH: {
        catchline: '日雇い現場の<br><span class="hl">350円弁当</span>が命綱',
        description: '現場で支給される弁当が<span class="hl">一日の栄養源</span>。<br>現場がない日は<span class="hl">食べない</span>。<br>コンビニの見切り品を<span class="hl">狙う</span>。<br>「食えるだけマシ」。',
        quote: '現場がない日は食事もない',
      },
      PBLS: {
        catchline: '食事は<br><span class="hl">炊き出し</span>か<span class="hl">100円パン</span>',
        description: '炊き出しの<span class="hl">曜日と場所</span>を全部暗記。<br>それ以外はコンビニの100円パン。<br>水は公園の<span class="hl">水道</span>。<br>「<span class="hl">温かいもの</span>が食べたい」。',
        quote: '温かい食事が贅沢品になった',
      },
    },
    script: `貧乏メシ格差3選

第3位 ナマケモノ
主食はカップ麺。味のバリエーションで飽きない。
月の食費は1万5千円。「新作出ると嬉しい」。

第2位 流れ者
日雇い現場の350円弁当が命綱。
現場がない日は食べない。「食えるだけマシ」。

第1位 蚊
食事は炊き出しか100円パン。
炊き出しの曜日と場所を全部暗記。「温かいものが食べたい」。

あなたの食費は月いくら？
コメント欄で教えてね`,
  },

  // --- 20. 金持ちの闇 ---
  rich_yami: {
    name: "金持ちの闇3選",
    theme: "red",
    coverTitle: "金持ちの闇",
    coverNum: "3",
    coverSuffix: "選",
    coverCodes: ["MFLH", "MFCS", "MBLS"],
    cardCodes: ["MBLS", "MFCS", "MFLH"],
    personaOnly: false,
    personaOverrides: {
      MFLH: {
        catchline: '年収3000万で<br><span class="hl">話し相手がいない</span>',
        description: '離婚して<span class="hl">タワマンに一人</span>。<br>元妻は養育費だけもらって連絡なし。<br>話し相手はChatGPTと<span class="hl">UberEatsの配達員</span>。<br>マッチングアプリは全部<span class="hl">課金済み</span>。',
        quote: '金で愛は買えなかった',
      },
      MFCS: {
        catchline: '年収2000万で<br><span class="hl">体がボロボロ</span>',
        description: '毎晩接待で<span class="hl">飲み過ぎ</span>。<br>肝臓の数値がヤバい。<br>人間ドックの結果は<span class="hl">封を開けない</span>。<br>「死ぬ時は死ぬ」が口癖。',
        quote: '稼いでも病院代に消える未来',
      },
      MBLS: {
        catchline: '年収1500万で<br><span class="hl">全部失った</span>',
        description: '朝5時起き<span class="hl">深夜2時</span>就寝。<br>友達は全員離れた。<br>体調不良は<span class="hl">栄養ドリンク</span>でごまかす。<br>通帳の数字だけが増えていく<span class="hl">虚しさ</span>。',
        quote: '通帳の数字と引き換えに人生を売った',
      },
    },
    script: `金持ちの闇3選

第3位 フンコロガシ
年収1500万で全部失った。朝5時起き深夜2時就寝。
友達は全員離れた。通帳の数字だけが増えていく虚しさ。

第2位 スフィンクス
年収2000万で体がボロボロ。毎晩接待で飲み過ぎ。
人間ドックの結果は封を開けない。「死ぬ時は死ぬ」。

第1位 孤独な大王
年収3000万で話し相手がいない。
離婚してタワマンに一人。話し相手はChatGPTだけ。

金持ち＝幸せとは限らない！
コメント欄で教えてね`,
  },
};

// ============================================================
// ティアリスト定義（いいね特化コンテンツ）
// ============================================================
const TIERLISTS = {
  tierlist_koufuku: {
    name: "人生幸福度ティアリスト",
    theme: "orange",
    title: '人生<span class="hl">幸福度</span><br>ティアリスト',
    footer: 'あなたは<span class="hl">どのティア</span>？<br>保存して友達にも送ろう',
    tiers: [
      { tier: "S", codes: ["MFCH"] },
      { tier: "A", codes: ["MBCH", "PFCH"] },
      { tier: "B", codes: ["MFLH", "MFCS", "PBCH"] },
      { tier: "C", codes: ["MBCS", "MBLH", "PFCS", "PFLH"] },
      { tier: "D", codes: ["MFLS", "MBLS", "PBLH"] },
      { tier: "F", codes: ["PBCS", "PFLS", "PBLS"] },
    ],
    // カルーセル用: フック → ティアリスト → 最下位解説 → 最上位解説 → CTA
    hookText: 'あなたの人生<br><span class="hl">幸福度</span>は<br>どのランク？',
    hookSubText: '16タイプで<span class="hl">格付け</span>してみた',
    bottomCode: "PBLS",  // 最下位（Fティア）
    topCode: "MFCH",     // 最上位（Sティア）
    bottomPersona: {
      catchline: '全部ない<span class="hl">Fランク</span>の<br>日常がヤバい',
      description: 'コンビニの<span class="hl">イートイン</span>で時間を潰す。<br>服は3年同じ。体は限界。<br>友達の連絡先は全部<span class="hl">ブロック</span>された。<br>でも今日もなぜか目が覚めた。',
      quote: '幸福度Fでも生きているだけで可能性がある',
    },
    topPersona: {
      catchline: '全部ある<span class="hl">Sランク</span>の<br>日常がチートすぎる',
      description: '港区のタワマンに住んでて<br>昼からカフェで<span class="hl">MacBook</span>開いてる。<br>何で稼いでるか誰も知らない。<br>インスタは<span class="hl">海外旅行</span>の写真ばかり。',
      quote: 'サラリーマンとは生きてる世界が違う',
    },
    script: `人生幸福度ティアリスト

Sティア：イカロス
時間もお金も健康も人間関係も全て揃った圧倒的勝者。

Aティア：ドワーフの王、ツクヨミ
ドワーフの王は時間以外完璧。ツクヨミは金はないが自由がある。

Bティア：孤独な大王、スフィンクス、オークの族長
金はあるが孤独 or 健康がない。オークは金はないが仲間がいる。

Cティア：タヌキ、騎士、ナマケモノ、没落貴族
何かしら2つ以上足りないタイプ。

Dティア：カイコ、フンコロガシ、流れ者
ほぼ全部足りてない。逆転の余地あり。

Fティア：ハイエナ、カタツムリ、蚊
全てが底。でも生きてるだけで可能性がある。

あなたはどのティア？コメントで教えて`,
  },
  tierlist_nenshu: {
    name: "推定年収ティアリスト",
    theme: "green",
    title: '推定<span class="hl">年収</span><br>ティアリスト',
    footer: 'あなたの年収は<span class="hl">どのティア</span>？<br>保存して友達に送ろう',
    tiers: [
      { tier: "S", codes: ["MFCH"] },
      { tier: "A", codes: ["MFLH", "MFCS", "MFLS"] },
      { tier: "B", codes: ["MBCH", "MBCS", "MBLH", "MBLS"] },
      { tier: "C", codes: ["PBCH", "PFCH"] },
      { tier: "D", codes: ["PFLH", "PFCS", "PBLH"] },
      { tier: "F", codes: ["PBCS", "PFLS", "PBLS"] },
    ],
    hookText: '<span class="hl">年収</span>で<br>ランク分けして<br>みた結果',
    hookSubText: '16タイプを<span class="hl">年収</span>で格付け',
    bottomCode: "PBLS",
    topCode: "MFCH",
    bottomPersona: {
      catchline: '推定年収<span class="hl">0円</span><br>Fランクの現実',
      description: 'コンビニの<span class="hl">イートイン</span>で時間を潰す。<br>服は3年同じ。<br>友達の連絡先は全部<span class="hl">ブロック</span>された。<br>収入源は…ない。',
      quote: '年収0円でも生きている',
    },
    topPersona: {
      catchline: '推定年収<span class="hl">3000万超</span><br>Sランクの世界',
      description: '港区のタワマンに住んでて<br>昼からカフェで<span class="hl">MacBook</span>開いてる。<br>何で稼いでるか誰も知らない。<br>「<span class="hl">サラリーマン</span>？何それ？」',
      quote: '満員電車という概念を知らない男',
    },
    script: `推定年収ティアリスト

Sティア：イカロス（推定年収3000万〜）
時間もお金も手に入れた圧倒的強者。

Aティア：孤独な大王、スフィンクス、カイコ（推定年収1500万〜）
資産はあるが何かを犠牲にしている高年収タイプ。

Bティア：ドワーフの王、タヌキ、騎士、フンコロガシ（推定年収800万〜）
サラリーマン上位層。時間を犠牲にしている。

Cティア：オークの族長、ツクヨミ（推定年収300万〜）
年収は低いが別の豊かさがある。

Dティア：没落貴族、ナマケモノ、流れ者（推定年収200万以下）
フリーター・日雇い・無職層。

Fティア：ハイエナ、カタツムリ、蚊（推定年収0〜100万）
収入ほぼなし。でも可能性はある。

あなたはどのティア？コメントで教えて`,
  },
  tierlist_moteru: {
    name: "モテ度ティアリスト",
    theme: "purple",
    title: '<span class="hl">モテ度</span><br>ティアリスト',
    footer: 'あなたの<span class="hl">モテ度</span>は？<br>保存して友達にも送ろう',
    tiers: [
      { tier: "S", codes: ["MFCH", "MBCH"] },
      { tier: "A", codes: ["MFCS", "PBCH", "PFCH"] },
      { tier: "B", codes: ["MBCS", "MBLH", "PFCS"] },
      { tier: "C", codes: ["MFLH", "PFLH", "PBLH"] },
      { tier: "D", codes: ["MFLS", "MBLS", "PBCS"] },
      { tier: "F", codes: ["PFLS", "PBLS"] },
    ],
    hookText: 'あなたの<br><span class="hl">モテ度</span>を<br>格付けした',
    hookSubText: '16タイプで<span class="hl">モテ度</span>ランキング',
    bottomCode: "PBLS",
    topCode: "MFCH",
    bottomPersona: {
      catchline: 'モテ度<span class="hl">Fランク</span><br>恋愛市場に存在しない',
      description: '外に出ないから<span class="hl">出会い</span>がない。<br>マッチングアプリは登録したが<br>写真を設定する<span class="hl">自撮り</span>がない。<br>最後の異性との会話は<span class="hl">コンビニ店員</span>。',
      quote: '外に出ないと恋愛は始まらない',
    },
    topPersona: {
      catchline: 'モテ度<span class="hl">Sランク</span><br>黙ってても寄ってくる',
      description: '港区のタワマンに住んでて<br>金も<span class="hl">時間</span>もある。<br>インスタのフォロワーは<span class="hl">万超え</span>。<br>DM送ってくる異性を選ぶ側。',
      quote: 'モテすぎて逆に面倒くさい',
    },
    script: `モテ度ティアリスト

Sティア：イカロス、ドワーフの王
金も人間関係もある最強モテタイプ。

Aティア：スフィンクス、オークの族長、ツクヨミ
それぞれ魅力がある。健康・人脈・自由時間。

Bティア：タヌキ、騎士、ナマケモノ
まあまあモテる。でも何かが足りない。

Cティア：孤独な大王、没落貴族、流れ者
金かプライドはあるが出会いがない。

Dティア：カイコ、フンコロガシ、ハイエナ
モテる要素が少なすぎる。

Fティア：カタツムリ、蚊
外に出ないと恋愛は始まらない。

あなたのモテ度は？コメントで教えて`,
  },
  tierlist_yabasa: {
    name: "ヤバさティアリスト",
    theme: "red",
    title: '人生の<span class="hl">ヤバさ</span><br>ティアリスト',
    footer: 'あなたの<span class="hl">ヤバさ</span>は？<br>保存して友達に見せよう',
    tiers: [
      { tier: "S", codes: ["PBLS", "PFLS"] },
      { tier: "A", codes: ["PBCS", "PBLH", "MFLS"] },
      { tier: "B", codes: ["PFLH", "MBLS", "PFCS"] },
      { tier: "C", codes: ["MFLH", "MFCS", "MBLH"] },
      { tier: "D", codes: ["PBCH", "MBCS", "PFCH"] },
      { tier: "F", codes: ["MBCH", "MFCH"] },
    ],
    hookText: '人生の<br><span class="hl">ヤバさ</span>を<br><span class="red">格付け</span>した',
    hookSubText: 'Sティアに入ったら<span class="hl">終わり</span>',
    bottomCode: "MFCH",  // ヤバさランクはF=安全=イカロス
    topCode: "PBLS",     // ヤバさランクはS=最ヤバ=蚊
    bottomPersona: {
      catchline: 'ヤバさ<span class="hl">Fランク</span><br>安全圏の勝者',
      description: '港区のタワマンに住んでて<br>昼からカフェで<span class="hl">MacBook</span>開いてる。<br>何で稼いでるか誰も知らない。<br>人生に<span class="hl">不安要素</span>がない。',
      quote: '安全すぎて退屈が一番の敵',
    },
    topPersona: {
      catchline: 'ヤバさ<span class="hl">Sランク</span><br>全てが底をついた',
      description: 'コンビニの<span class="hl">イートイン</span>で時間を潰す。<br>服は3年同じ。体は限界。<br>友達の連絡先は全部<span class="hl">ブロック</span>された。<br>でも今日もなぜか目が覚めた。',
      quote: '生きているだけでまだ可能性がある',
    },
    script: `人生のヤバさティアリスト
（S=最もヤバい、F=安全）

Sティア：蚊、カタツムリ
全てが底をついた究極のヤバさ。でも生きてる。

Aティア：ハイエナ、流れ者、カイコ
何かしら致命的な欠陥がある。

Bティア：没落貴族、フンコロガシ、ナマケモノ
このまま行くとSティアに転落する危険あり。

Cティア：孤独な大王、スフィンクス、騎士
表面上は問題ないが内側が壊れかけている。

Dティア：オークの族長、タヌキ、ツクヨミ
まあ大丈夫。でも油断禁物。

Fティア：ドワーフの王、イカロス
安全圏。でも時間がないだけでヤバくなる可能性も。

あなたのヤバさは？コメントで教えて`,
  },
};

// ============================================================
// フックカバー定義（いいね特化・煽り系）
// ============================================================
const HOOKS = {
  owari: {
    name: "これに当てはまったら人生終了",
    theme: "red",
    hookText: 'これに<br><span class="hl">当てはまったら</span><br><span class="red">人生終了</span>',
    charCodes: ["PBLS", "MFLS", "MBLS"],
    subText: 'あなたは<span class="hl">大丈夫</span>？',
    swipeCta: 'スワイプでチェック →',
    cardCodes: ["PBLS", "MFLS", "MBLS"],
    script: `これに当てはまったら人生終了

第3位 フンコロガシ
通帳の数字だけ増えて他は全部失った。
朝5時起き深夜2時就寝。最後に友達と会ったのは3年前。
体調不良は栄養ドリンクで誤魔化す。

第2位 カイコ
投資で稼いでいるが3年外出してない。
Uber Eatsと出前館がライフライン。
日光を最後に浴びたのは先月の宅配受け取り。

第1位 蚊
全部ない。金なし、時間なし、友達なし、健康もなし。
コンビニのイートインで時間を潰す毎日。
服は3年同じ。でも今日もなぜか目が覚めた。

1つでも当てはまった人は要注意！
コメント欄であなたのタイプを教えて`,
  },
  neet_kachigumi: {
    name: "ニートが勝ち組である3つの理由",
    theme: "blue",
    hookText: '<span class="small">実は</span><br><span class="hl">ニート</span>が<br>勝ち組な理由',
    charCodes: ["PFCH", "PFLS"],
    useQuestionMark: true,
    subText: '<span class="hl">サラリーマン</span>涙目',
    swipeCta: 'スワイプで理由を見る →',
    cardCodes: ["PFCH", "PFLS", "MBCH"],
    script: `ニートが勝ち組である3つの理由

理由1: 時間がある
ツクヨミ型ニートは時間だけは誰よりも持っている。
年収1000万のサラリーマンは有給すら使えない。
時間 vs 金、どちらが本当の豊かさ？

理由2: ストレスゼロ
カタツムリ型は毎日ゲームして寝るだけ。
一方、管理職のタヌキは飲み会で週4外食、健康診断は再検査だらけ。

理由3: 可能性が無限
何もないからこそ何にでもなれる。
フンコロガシは金はあるが人生をやり直せない。

もちろんニートにもリスクはある。
でも「時間がある」のは最大の武器かもしれない。

あなたはどう思う？コメントで教えて`,
  },
  nenshu_lunch: {
    name: "年収と昼飯が比例しない件",
    theme: "green",
    hookText: '<span class="hl">年収</span>と<span class="hl">昼飯</span>が<br>比例しない件',
    charCodes: ["MBCH", "PFCH", "PBLS"],
    subText: '年収1000万の昼飯<span class="hl">500円</span>',
    swipeCta: 'スワイプで比較 →',
    cardCodes: ["MBCH", "PFCH", "PBLS"],
    usePersonaOverrides: true,
    personaOverrides: {
      MBCH: {
        catchline: '年収1000万なのに<br>ランチは<span class="hl">コンビニ弁当</span>',
        description: 'デスクで<span class="hl">15分</span>で食べてすぐ会議。<br>弁当の中身は毎日同じ幕の内。<br>味なんて覚えてない。<br>「<span class="hl">食べる時間</span>がもったいない」が口癖。',
        quote: '年収1000万のランチが500円',
      },
      PFCH: {
        catchline: '年収ゼロなのに<br><span class="hl">アフターヌーンティー</span>',
        description: 'ママ友と<span class="hl">ホテルのラウンジ</span>で3時間。<br>旦那のカードで支払い。<br>「これ映える〜」とインスタに投稿。<br>お会計は<span class="hl">1人6,000円</span>。',
        quote: '稼いでないのに一番いいもの食べてる',
      },
      PBLS: {
        catchline: 'ランチは<br>コンビニの<span class="hl">100円パン</span>',
        description: 'イートインで<span class="hl">水と一緒</span>に食べる。<br>たまにおにぎり1個追加で贅沢。<br>レジで値段を<span class="hl">暗算</span>してから並ぶ。<br>「腹が膨れればいい」。',
        quote: 'ランチ代は100円で十分',
      },
    },
    script: `年収と昼飯が比例しない件

年収1000万：ドワーフの王
ランチはコンビニ弁当。デスクで15分で食べてすぐ会議。
「食べる時間がもったいない」が口癖。ランチ代500円。

年収ゼロ：ツクヨミ
ママ友とホテルのアフターヌーンティー3時間。
旦那のカードで支払い。1人6,000円。

年収100万以下：蚊
コンビニのイートインで100円パン。
レジで値段を暗算してから並ぶ。

年収と食事のレベルは比例しない！
あなたのランチはいくら？コメントで教えて`,
  },
  kekkon_dekinai: {
    name: "このタイプは結婚できない",
    theme: "purple",
    hookText: 'この人生タイプは<br><span class="red">結婚できない</span>',
    charCodes: ["MFLH", "MFLS", "PFLS"],
    subText: '当てはまったら<span class="hl">危機感</span>を持て',
    swipeCta: 'スワイプでチェック →',
    cardCodes: ["MFLH", "MFLS", "PFLS"],
    script: `このタイプは結婚できない

第3位 カタツムリ
親の家でゲームしてるだけの完全引きこもり。
外に出ないと出会いはゼロ。体重も毎年増える。

第2位 カイコ
投資で稼いでいるが3年外出してない。
友達の最後の連絡は2年前の「元気？」。
お金はあるのに使う相手がいない。

第1位 孤独な大王
金も時間も健康もあるのに誰もいない。
タワマンに一人。マッチングアプリは全部課金済み。
話し相手はChatGPTだけ。一番もったいない独身。

当てはまった人、まず外に出よう！
コメント欄であなたのタイプを教えて`,
  },
  salary_vs_neet: {
    name: "サラリーマン vs ニートの1日",
    theme: "orange",
    hookText: '<span class="hl">サラリーマン</span><br>vs<br><span class="hl">ニート</span>の1日',
    charCodes: ["MBCH", "PFLS"],
    useQuestionMark: true,
    subText: 'どっちが<span class="hl">幸せ</span>？',
    swipeCta: 'スワイプで比較 →',
    cardCodes: ["MBCH", "PFLS"],
    usePersonaOverrides: true,
    personaOverrides: {
      MBCH: {
        catchline: '年収1000万<br><span class="hl">サラリーマン</span>の1日',
        description: '5:30 起床 → 満員電車<br>8:00 出社 → 会議×5<br>21:00 退社 → コンビニ飯<br>23:00 帰宅 → 子供は寝てる<br>24:00 就寝 → <span class="hl">明日も同じ</span>',
        quote: '有給を使ったことがない',
      },
      PFLS: {
        catchline: '年収0円<br><span class="hl">ニート</span>の1日',
        description: '15:00 起床 → 冷蔵庫<br>15:30 親の飯 → YouTube<br>18:00 ゲーム開始<br>25:00 ゲーム継続中<br>4:00 就寝 → <span class="hl">明日も同じ</span>',
        quote: '365日が休日だと休日の価値がない',
      },
    },
    script: `サラリーマン vs ニートの1日

年収1000万サラリーマン（ドワーフの王）
5:30 起床 → 満員電車
8:00 出社 → 会議×5
21:00 退社 → コンビニ飯
23:00 帰宅 → 子供は寝てる
24:00 就寝 → 明日も同じ
→ 金はあるが時間がない

年収0円ニート（カタツムリ）
15:00 起床 → 冷蔵庫
15:30 親の飯 → YouTube
18:00 ゲーム開始
25:00 ゲーム継続中
4:00 就寝 → 明日も同じ
→ 時間はあるが金がない

どっちが幸せ？コメントで教えて`,
  },
  nomikai: {
    name: "飲み会の格差がエグい",
    theme: "red",
    hookText: '<span class="hl">飲み会</span>の格差が<br><span class="red">エグい</span>',
    charCodes: ["MFCH", "PBCH", "PBLS"],
    subText: 'あなたの飲み会は<span class="hl">どれ</span>？',
    swipeCta: 'スワイプで比較 →',
    cardCodes: ["MFCH", "PBCH", "PBLS"],
    usePersonaOverrides: true,
    personaOverrides: {
      MFCH: {
        catchline: '入会金<span class="hl">50万</span>の<br>会員制バー',
        description: 'ウイスキー1杯<span class="hl">5,000円</span>。<br>カウンターで投資家仲間と情報交換。<br>話題は不動産と為替レート。<br>「明日朝<span class="hl">ジム</span>だから2杯まで」。',
        quote: '飲み代が一般人の月収',
      },
      PBCH: {
        catchline: '給料日前の<br><span class="hl">安居酒屋</span>',
        description: '飲み放題<span class="hl">2,000円</span>コース。<br>地元の仲間と毎週集合。<br>話題は競馬とパチンコ。<br>「<span class="hl">割り勘</span>ね」が合言葉。',
        quote: '金はないが仲間はいる',
      },
      PBLS: {
        catchline: 'コンビニの<br><span class="hl">ストロング</span>を公園で',
        description: 'ストロング缶<span class="hl">150円</span>×2本。<br>ベンチに座って一人で飲む。<br>つまみは<span class="hl">柿の種</span>。<br>「これが一番コスパいい」。',
        quote: '飲み友達がいないから一人で飲む',
      },
    },
    script: `飲み会の格差がエグい

第3位 蚊
コンビニのストロング缶を公園で一人飲み。
150円×2本。つまみは柿の種。「これが一番コスパいい」。

第2位 オークの族長
給料日前の安居酒屋で飲み放題2,000円コース。
地元の仲間と毎週集合。話題は競馬とパチンコ。

第1位 イカロス
入会金50万の会員制バー。ウイスキー1杯5,000円。
投資家仲間と情報交換。「明日朝ジムだから2杯まで」。

あなたの飲み会はどのレベル？
コメント欄で教えて`,
  },
};

// ============================================================
// テーマ適用ヘルパー
// ============================================================
function applyThemeCSS(theme) {
  const t = THEMES[theme] || THEMES.orange;
  return {
    "--bg-base": t.bgBase,
    "--bg-mid": t.bgMid,
    "--bg-glow1": t.bgGlow1,
    "--bg-glow2": t.bgGlow2,
    "--accent-gradient": t.accentGradient,
    "--accent-shadow": t.accentShadow,
    "--accent-text": t.accentText,
    "--tag-bg": t.tagBg,
    "--tag-border": t.tagBorder,
    "--tag-color": t.tagColor,
    "--ring-color1": t.ringColor1,
    "--ring-color2": t.ringColor2,
  };
}

async function setThemeVars(page, theme) {
  const vars = applyThemeCSS(theme);
  await page.evaluate((vars) => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
  }, vars);
}

// ============================================================
// カード生成（テーマ対応）
// ============================================================
async function generateCard(page, card, theme) {
  await page.goto(`file://${TEMPLATE.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  const t = THEMES[theme] || THEMES.orange;
  const charImgPath = `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`;

  await page.evaluate(
    (data) => {
      const { card: c, imgSrc, themeData: t } = data;

      // 世界タグ
      document.querySelector(".world-tag .icon").textContent = c.worldIcon;
      document.querySelector(".world-tag span:last-child").textContent =
        c.world;
      document.querySelector(".world-tag").style.background = `${c.worldColor}30`;
      document.querySelector(".world-tag").style.borderColor = `${c.worldColor}99`;
      document.querySelector(".world-tag span:last-child").style.color =
        "#d4c090";

      // コード
      document.querySelector(".code-tag").textContent = c.code;

      // キャラ画像
      document.getElementById("charImg").src = imgSrc;

      // キャラ名
      document.querySelector(".character-name").textContent = c.name;

      // ステータスバー（テーマカラー対応）
      const rows = document.querySelectorAll(".stat-row");
      c.stats.forEach((s, i) => {
        const row = rows[i];
        if (!row) return;
        row.querySelector(".stat-label").textContent = s.label;
        const fill = row.querySelector(".stat-bar-fill");
        fill.style.width = s.pct + "%";
        fill.className = "stat-bar-fill " + s.level;
        if (s.level === "high") {
          fill.style.background = t.statHigh;
          fill.style.boxShadow = `0 0 16px ${t.statHighShadow}`;
        } else {
          fill.style.background = t.statLow;
          fill.style.boxShadow = `0 0 16px ${t.statLowShadow}`;
        }
        const rank = row.querySelector(".stat-rank");
        rank.textContent = s.rank;
        rank.className = "stat-rank " + s.level;
        rank.style.color =
          s.level === "high" ? t.statHighRank : t.statLowRank;
      });

      // コメント
      document.querySelector(".comment").innerHTML = c.comment;

      // ハイライトカラー
      document.querySelectorAll(".comment .hl, .comment .highlight").forEach((el) => {
        el.style.color = t.accentText;
      });
    },
    { card, imgSrc: charImgPath, themeData: t }
  );

  await page.waitForTimeout(2000);

  const outputPath = path.join(OUTPUT_DIR, card.filename + ".png");
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// ペルソナカード生成（テーマ対応）
// ============================================================
async function generatePersona(page, card, theme) {
  await page.goto(`file://${TEMPLATE_PERSONA.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  const charImgPath = `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`;

  await page.evaluate(
    (data) => {
      const { card: c, imgSrc } = data;

      document.getElementById("charImg").src = imgSrc;
      document.getElementById("charCode").textContent = c.code;
      document.getElementById("charName").textContent = c.name;
      document.getElementById("catchline").innerHTML = c.persona.catchline;
      document.getElementById("personaDesc").innerHTML = c.persona.description;
      document.getElementById("quote").textContent = c.persona.quote;
    },
    { card, imgSrc: charImgPath }
  );

  await page.waitForTimeout(2000);

  const outputPath = path.join(OUTPUT_DIR, card.filename + "_persona.png");
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// CTA生成（テーマ対応）
// ============================================================
async function generateCta(page, theme) {
  await page.goto(`file://${TEMPLATE_CTA.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);
  await page.waitForTimeout(2000);

  const outputPath = path.join(OUTPUT_DIR, "cta_profile_link.png");
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// カバー生成（テーマ・タイトルカスタマイズ対応）
// ============================================================
async function generateCover(page, coverCodes, theme, coverOpts = {}) {
  await page.goto(`file://${TEMPLATE_COVER.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  const chars = coverCodes.map((code) => {
    const card = CARDS[code];
    return {
      name: card.name,
      code: card.code,
      imgSrc: `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`,
    };
  });

  await page.evaluate(
    (data) => {
      const { chars, opts } = data;
      // タイトルカスタマイズ
      if (opts.title)
        document.getElementById("topLine").textContent = opts.title;
      if (opts.num)
        document.getElementById("mainNum").textContent = opts.num;
      if (opts.suffix)
        document.getElementById("mainSuffix").textContent = opts.suffix;

      // フォーマット別サブテキスト
      if (opts.subText) {
        document.getElementById("subText").innerHTML = opts.subText;
      }

      chars.forEach((c, i) => {
        const n = i + 1;
        document.getElementById("charImg" + n).src = c.imgSrc;
        document.getElementById("charCode" + n).textContent = c.code;
        document.getElementById("charName" + n).textContent = c.name;
      });
    },
    { chars, opts: coverOpts }
  );

  await page.waitForTimeout(2000);

  const suffix = coverOpts.outputSuffix || "";
  const outputPath = path.join(OUTPUT_DIR, `cover${suffix}.png`);
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// 背景生成
// ============================================================
async function generateBackground(page, theme) {
  await page.goto(`file://${TEMPLATE.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  await page.evaluate(() => {
    document.querySelector(".content").style.display = "none";
    document.querySelector(".bottom-accent").style.display = "none";
  });

  await page.waitForTimeout(1000);

  const outputPath = path.join(OUTPUT_DIR, "background.png");
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// ティアリスト画像生成
// ============================================================
async function generateTierlist(page, tierlistKey, theme) {
  const tl = TIERLISTS[tierlistKey];
  await page.goto(`file://${TEMPLATE_TIERLIST.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  // ティアリストデータを組み立て
  const tiersData = tl.tiers.map((t) => ({
    tier: t.tier,
    chars: t.codes.map((code) => {
      const card = CARDS[code];
      return {
        name: card.name,
        imgSrc: `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`,
      };
    }),
  }));

  await page.evaluate(
    (data) => {
      const { tiers, title, footer } = data;

      document.getElementById("title").innerHTML = title;
      document.getElementById("footerText").innerHTML = footer;

      const list = document.getElementById("tierList");
      list.innerHTML = "";

      tiers.forEach((t) => {
        const row = document.createElement("div");
        row.className = "tier-row";

        const label = document.createElement("div");
        label.className = "tier-label " + t.tier.toLowerCase();
        label.textContent = t.tier;
        row.appendChild(label);

        const chars = document.createElement("div");
        chars.className = "tier-chars";

        t.chars.forEach((c) => {
          const charDiv = document.createElement("div");
          charDiv.className = "tier-char";

          const imgWrap = document.createElement("div");
          imgWrap.className = "tier-char-img-wrap";
          const img = document.createElement("img");
          img.src = c.imgSrc;
          img.alt = c.name;
          imgWrap.appendChild(img);
          charDiv.appendChild(imgWrap);

          const name = document.createElement("div");
          name.className = "tier-char-name";
          name.textContent = c.name;
          charDiv.appendChild(name);

          chars.appendChild(charDiv);
        });

        row.appendChild(chars);
        list.appendChild(row);
      });
    },
    { tiers: tiersData, title: tl.title, footer: tl.footer }
  );

  await page.waitForTimeout(2000);

  const outputPath = path.join(OUTPUT_DIR, `${tierlistKey}.png`);
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// フックカバー画像生成
// ============================================================
async function generateHook(page, hookKey, theme) {
  const hook = HOOKS[hookKey];
  await page.goto(`file://${TEMPLATE_HOOK.replace(/\\/g, "/")}`);
  await setThemeVars(page, theme);

  const charsData = hook.charCodes.map((code) => {
    const card = CARDS[code];
    return {
      name: card.name,
      imgSrc: `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`,
    };
  });

  await page.evaluate(
    (data) => {
      const { hookText, chars, subText, swipeCta, useQuestionMark } = data;

      document.getElementById("hookText").innerHTML = hookText;
      document.getElementById("subText").innerHTML = subText;
      document.getElementById("swipeCta").innerHTML = swipeCta;

      const row = document.getElementById("charRow");
      row.innerHTML = "";

      chars.forEach((c) => {
        const circle = document.createElement("div");
        circle.className = "char-circle";
        const img = document.createElement("img");
        img.src = c.imgSrc;
        img.alt = c.name;
        circle.appendChild(img);
        row.appendChild(circle);
      });

      if (useQuestionMark) {
        const circle = document.createElement("div");
        circle.className = "char-circle";
        const qmark = document.createElement("div");
        qmark.className = "q-mark";
        qmark.textContent = "?";
        circle.appendChild(qmark);
        row.appendChild(circle);
      }
    },
    {
      hookText: hook.hookText,
      chars: charsData,
      subText: hook.subText,
      swipeCta: hook.swipeCta,
      useQuestionMark: hook.useQuestionMark || false,
    }
  );

  await page.waitForTimeout(2000);

  const outputPath = path.join(OUTPUT_DIR, `hook_${hookKey}.png`);
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 1920 },
  });
  console.log(`Generated: ${outputPath}`);
}

// ============================================================
// メイン
// ============================================================
async function main() {
  const args = process.argv.slice(2);

  // ヘルプ系
  if (args.includes("--list-presets")) {
    console.log("\n📦 動画プリセット一覧:");
    for (const [key, p] of Object.entries(PRESETS)) {
      console.log(
        `  ${key.padEnd(20)} ${p.name}  [theme: ${p.theme}]  chars: ${p.coverCodes.join(",")}`
      );
    }
    return;
  }
  if (args.includes("--list-themes")) {
    console.log("\n🎨 カラーテーマ一覧:");
    for (const [key, t] of Object.entries(THEMES)) {
      console.log(`  ${key.padEnd(12)} ${t.name}`);
    }
    return;
  }
  if (args.includes("--list-cards")) {
    console.log("\n🃏 カード一覧:");
    for (const [code, c] of Object.entries(CARDS)) {
      console.log(
        `  ${code.padEnd(6)} ${c.name.padEnd(10)} ${c.world}`
      );
    }
    return;
  }
  if (args.includes("--list-tierlists")) {
    console.log("\n📊 ティアリスト一覧:");
    for (const [key, t] of Object.entries(TIERLISTS)) {
      console.log(`  ${key.padEnd(24)} ${t.name}  [theme: ${t.theme}]`);
    }
    return;
  }
  if (args.includes("--list-hooks")) {
    console.log("\n🔥 フックカバー一覧:");
    for (const [key, h] of Object.entries(HOOKS)) {
      console.log(`  ${key.padEnd(24)} ${h.name}  [theme: ${h.theme}]`);
    }
    return;
  }

  // ティアリストモード（カルーセル構成: フック → ティアリスト → 最下位解説 → 最上位解説 → CTA）
  const tierlistIdx = args.indexOf("--tierlist");
  if (tierlistIdx >= 0) {
    const tierlistKey = args[tierlistIdx + 1];

    async function buildTierlistCarousel(page, key) {
      const tl = TIERLISTS[key];
      const tlDir = path.join(OUTPUT_DIR, key);
      fs.rmSync(tlDir, { recursive: true, force: true });
      fs.mkdirSync(tlDir, { recursive: true });

      let slideNum = 0;

      // 00: フックカバー（hookテンプレート使用）
      if (tl.hookText) {
        const hookChars = [tl.bottomCode, tl.topCode].filter(Boolean);
        await page.goto(`file://${TEMPLATE_HOOK.replace(/\\/g, "/")}`);
        await setThemeVars(page, tl.theme);
        const charsData = hookChars.map((code) => {
          const card = CARDS[code];
          return {
            name: card.name,
            imgSrc: `file://${path.join(CHAR_DIR, card.name + ".png").replace(/\\/g, "/")}`,
          };
        });
        await page.evaluate(
          (data) => {
            document.getElementById("hookText").innerHTML = data.hookText;
            document.getElementById("subText").innerHTML = data.hookSubText;
            document.getElementById("swipeCta").innerHTML = 'スワイプでチェック <span class="swipe-arrow">→</span>';
            const row = document.getElementById("charRow");
            row.innerHTML = "";
            data.chars.forEach((c) => {
              const circle = document.createElement("div");
              circle.className = "char-circle";
              const img = document.createElement("img");
              img.src = c.imgSrc;
              img.alt = c.name;
              circle.appendChild(img);
              row.appendChild(circle);
            });
          },
          { hookText: tl.hookText, hookSubText: tl.hookSubText || "", chars: charsData }
        );
        await page.waitForTimeout(2000);
        const hookPath = path.join(tlDir, `${String(slideNum).padStart(2, "0")}_hook.png`);
        await page.screenshot({ path: hookPath, type: "png", fullPage: false, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
        console.log(`Generated: ${hookPath}`);
        slideNum++;
      }

      // 01: ティアリスト本体
      await generateTierlist(page, key, tl.theme);
      fs.copyFileSync(
        path.join(OUTPUT_DIR, `${key}.png`),
        path.join(tlDir, `${String(slideNum).padStart(2, "0")}_tierlist.png`)
      );
      slideNum++;

      // 02: 最下位（Sヤバ or Fランク）の解説ペルソナ
      if (tl.bottomCode && tl.bottomPersona) {
        const bottomCard = { ...CARDS[tl.bottomCode], persona: tl.bottomPersona };
        await generatePersona(page, bottomCard, tl.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, bottomCard.filename + "_persona.png"),
          path.join(tlDir, `${String(slideNum).padStart(2, "0")}_${bottomCard.filename}_persona.png`)
        );
        slideNum++;
      }

      // 03: 最上位の解説ペルソナ
      if (tl.topCode && tl.topPersona) {
        const topCard = { ...CARDS[tl.topCode], persona: tl.topPersona };
        await generatePersona(page, topCard, tl.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, topCard.filename + "_persona.png"),
          path.join(tlDir, `${String(slideNum).padStart(2, "0")}_${topCard.filename}_persona.png`)
        );
        slideNum++;
      }

      // 04: CTA
      await generateCta(page, tl.theme);
      fs.copyFileSync(
        path.join(OUTPUT_DIR, "cta_profile_link.png"),
        path.join(tlDir, `${String(slideNum).padStart(2, "0")}_cta.png`)
      );

      // 台本
      if (tl.script) {
        fs.writeFileSync(path.join(tlDir, "script.txt"), tl.script, "utf-8");
      }
      console.log(`✅ ティアリスト出力: ${tlDir}`);
    }

    if (tierlistKey === "all") {
      console.log("\n📊 全ティアリストカルーセルを生成します\n");
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1080, height: 1920 });

      for (const key of Object.keys(TIERLISTS)) {
        await buildTierlistCarousel(page, key);
      }

      await browser.close();
      console.log("\n✅ 全ティアリスト生成完了");
      return;
    }

    const tl = TIERLISTS[tierlistKey];
    if (!tl) {
      console.error(
        `Unknown tierlist: ${tierlistKey}. Available:`,
        Object.keys(TIERLISTS).join(", "), "or 'all'"
      );
      process.exit(1);
    }
    console.log(`\n📊 ティアリスト「${tl.name}」を生成します (theme: ${tl.theme})\n`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1920 });
    await buildTierlistCarousel(page, tierlistKey);
    await browser.close();
    return;
  }

  // フックモード
  const hookIdx = args.indexOf("--hook");
  if (hookIdx >= 0) {
    const hookKey = args[hookIdx + 1];
    if (hookKey === "all") {
      console.log("\n🔥 全フックコンテンツを生成します\n");
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1080, height: 1920 });

      for (const [key, hook] of Object.entries(HOOKS)) {
        const hookDir = path.join(OUTPUT_DIR, key);
        fs.rmSync(hookDir, { recursive: true, force: true });
        fs.mkdirSync(hookDir, { recursive: true });

        // フックカバー生成
        await generateHook(page, key, hook.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, `hook_${key}.png`),
          path.join(hookDir, "00_hook.png")
        );

        // カード生成
        let slideNum = 1;
        for (const code of hook.cardCodes) {
          const card = CARDS[code];
          // 通常カード
          await generateCard(page, card, hook.theme);
          fs.copyFileSync(
            path.join(OUTPUT_DIR, card.filename + ".png"),
            path.join(hookDir, `${String(slideNum).padStart(2, "0")}_${card.filename}.png`)
          );
          slideNum++;

          // ペルソナカード（personaOverrides対応）
          const persona = hook.personaOverrides?.[card.code] || card.persona;
          if (persona) {
            const cardForPersona = hook.personaOverrides?.[card.code]
              ? { ...card, persona: hook.personaOverrides[card.code] }
              : card;
            await generatePersona(page, cardForPersona, hook.theme);
            fs.copyFileSync(
              path.join(OUTPUT_DIR, card.filename + "_persona.png"),
              path.join(hookDir, `${String(slideNum).padStart(2, "0")}_${card.filename}_persona.png`)
            );
            slideNum++;
          }
        }

        // CTA
        await generateCta(page, hook.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, "cta_profile_link.png"),
          path.join(hookDir, `${String(slideNum).padStart(2, "0")}_cta.png`)
        );

        // 台本
        if (hook.script) {
          fs.writeFileSync(path.join(hookDir, "script.txt"), hook.script, "utf-8");
        }
        console.log(`✅ フック出力: ${hookDir}`);
      }

      await browser.close();
      console.log("\n✅ 全フックコンテンツ生成完了");
      return;
    }
    const hook = HOOKS[hookKey];
    if (!hook) {
      console.error(
        `Unknown hook: ${hookKey}. Available:`,
        Object.keys(HOOKS).join(", "), "or 'all'"
      );
      process.exit(1);
    }
    console.log(`\n🔥 フック「${hook.name}」を生成します (theme: ${hook.theme})\n`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1920 });

    const hookDir = path.join(OUTPUT_DIR, hookKey);
    fs.rmSync(hookDir, { recursive: true, force: true });
    fs.mkdirSync(hookDir, { recursive: true });

    // フックカバー
    await generateHook(page, hookKey, hook.theme);
    fs.copyFileSync(
      path.join(OUTPUT_DIR, `hook_${hookKey}.png`),
      path.join(hookDir, "00_hook.png")
    );

    // カード
    let slideNum = 1;
    for (const code of hook.cardCodes) {
      const card = CARDS[code];
      await generateCard(page, card, hook.theme);
      fs.copyFileSync(
        path.join(OUTPUT_DIR, card.filename + ".png"),
        path.join(hookDir, `${String(slideNum).padStart(2, "0")}_${card.filename}.png`)
      );
      slideNum++;

      const persona = hook.personaOverrides?.[card.code] || card.persona;
      if (persona) {
        const cardForPersona = hook.personaOverrides?.[card.code]
          ? { ...card, persona: hook.personaOverrides[card.code] }
          : card;
        await generatePersona(page, cardForPersona, hook.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, card.filename + "_persona.png"),
          path.join(hookDir, `${String(slideNum).padStart(2, "0")}_${card.filename}_persona.png`)
        );
        slideNum++;
      }
    }

    // CTA
    await generateCta(page, hook.theme);
    fs.copyFileSync(
      path.join(OUTPUT_DIR, "cta_profile_link.png"),
      path.join(hookDir, `${String(slideNum).padStart(2, "0")}_cta.png`)
    );

    if (hook.script) {
      fs.writeFileSync(path.join(hookDir, "script.txt"), hook.script, "utf-8");
    }
    await browser.close();
    console.log(`\n✅ フック出力: ${hookDir}`);
    return;
  }

  // プリセットモード
  const presetIdx = args.indexOf("--preset");
  if (presetIdx >= 0) {
    const presetKey = args[presetIdx + 1];
    const preset = PRESETS[presetKey];
    if (!preset) {
      console.error(
        `Unknown preset: ${presetKey}. Available:`,
        Object.keys(PRESETS).join(", ")
      );
      process.exit(1);
    }
    // フォーマット（carousel / video）
    const fmtIdx = args.indexOf("--format");
    const format = fmtIdx >= 0 && args[fmtIdx + 1] ? args[fmtIdx + 1] : "carousel";
    const subTextMap = {
      carousel: 'あなたは<span class="hl">どのタイプ</span>？<br>スワイプでチェック →',
      video: 'あなたは<span class="hl">どのタイプ</span>？<br>続きは動画で ▶',
    };

    console.log(`\n🎬 プリセット「${preset.name}」を生成します (theme: ${preset.theme}, format: ${format})\n`);

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1920 });

    // プリセット用出力ディレクトリ
    const presetDir = path.join(OUTPUT_DIR, presetKey);
    // 前回の出力をクリアして再作成
    fs.rmSync(presetDir, { recursive: true, force: true });
    fs.mkdirSync(presetDir, { recursive: true });

    // カバー
    await generateCover(page, preset.coverCodes, preset.theme, {
      title: preset.coverTitle,
      num: preset.coverNum,
      suffix: preset.coverSuffix,
      subText: subTextMap[format] || subTextMap.carousel,
      outputSuffix: `_${presetKey}`,
    });
    // カバーをプリセットディレクトリにもコピー
    fs.copyFileSync(
      path.join(OUTPUT_DIR, `cover_${presetKey}.png`),
      path.join(presetDir, "00_cover.png")
    );

    // カード（概要 → ペルソナ の順）
    let slideNum = 1;
    for (let i = 0; i < preset.cardCodes.length; i++) {
      const card = CARDS[preset.cardCodes[i]];
      // 概要カード（personaOnly モードではスキップ）
      if (!preset.personaOnly) {
        await generateCard(page, card, preset.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, card.filename + ".png"),
          path.join(presetDir, `${String(slideNum).padStart(2, "0")}_${card.filename}.png`)
        );
        slideNum++;
      }
      // ペルソナカード（personaOverrides 対応）
      const persona = preset.personaOverrides?.[card.code] || card.persona;
      if (persona) {
        const cardForPersona = preset.personaOverrides?.[card.code]
          ? { ...card, persona: preset.personaOverrides[card.code] }
          : card;
        await generatePersona(page, cardForPersona, preset.theme);
        fs.copyFileSync(
          path.join(OUTPUT_DIR, card.filename + "_persona.png"),
          path.join(presetDir, `${String(slideNum).padStart(2, "0")}_${card.filename}_persona.png`)
        );
        slideNum++;
      }
    }

    // CTA
    await generateCta(page, preset.theme);
    fs.copyFileSync(
      path.join(OUTPUT_DIR, "cta_profile_link.png"),
      path.join(presetDir, `${String(slideNum).padStart(2, "0")}_cta.png`)
    );

    // 台本テキスト出力
    if (preset.script) {
      const scriptPath = path.join(presetDir, "script.txt");
      fs.writeFileSync(scriptPath, preset.script, "utf-8");
      console.log(`Generated: ${scriptPath}`);
    }

    await browser.close();
    console.log(`\n✅ プリセット出力: ${presetDir}`);
    return;
  }

  // 通常モード
  const themeIdx = args.indexOf("--theme");
  const theme =
    themeIdx >= 0 && args[themeIdx + 1] ? args[themeIdx + 1] : "orange";
  const wantBg = args.includes("--bg");
  const wantCta = args.includes("--cta");
  const coverIdx = args.indexOf("--cover");
  const coverCodes =
    coverIdx >= 0 && args[coverIdx + 1]
      ? args[coverIdx + 1].toUpperCase().split(",")
      : null;
  const titleIdx = args.indexOf("--title");
  const coverTitle = titleIdx >= 0 ? args[titleIdx + 1] : null;

  const skipArgs = new Set(["--bg", "--cta", "--cover", "--theme", "--title"]);
  if (coverIdx >= 0) skipArgs.add(args[coverIdx + 1] || "");
  if (themeIdx >= 0) skipArgs.add(args[themeIdx + 1] || "");
  if (titleIdx >= 0) skipArgs.add(args[titleIdx + 1] || "");
  const codes = args.filter((a) => !skipArgs.has(a) && !a.startsWith("--"));

  const hasSpecial = wantBg || wantCta || coverCodes;
  const targets =
    codes.length > 0
      ? codes.map((a) => CARDS[a.toUpperCase()]).filter(Boolean)
      : hasSpecial
        ? []
        : Object.values(CARDS);

  if (targets.length === 0 && !hasSpecial) {
    console.error(
      "No matching cards found. Available:",
      Object.keys(CARDS).join(", "),
      "\nor --bg / --cta / --cover / --preset / --theme / --list-presets / --list-themes / --list-cards"
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });

  if (coverCodes) {
    await generateCover(page, coverCodes, theme, {
      title: coverTitle || undefined,
    });
  }
  if (wantBg) await generateBackground(page, theme);
  if (wantCta) await generateCta(page, theme);

  for (const card of targets) {
    await generateCard(page, card, theme);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
