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
      catchline: '時間もお金も手に入れた<br><span class="hl">圧倒的な強者</span>',
      description: 'サラリーマンは生きている世界が違うため<br>会うことがない。<br>平日の昼間から<span class="hl">犬の散歩</span>をしている<br>何をして稼いでいるのかわからない<br>オジサンが該当する。',
      quote: '全てを手にした者だけが見る景色',
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
      catchline: '全てあるのに<br><span class="hl">誰もいない</span>タイプ',
      description: '高年収で時間もあるのに<br>友達がいないIT社長とか、<br>離婚して<span class="hl">タワマンに一人</span>で住んでる<br>おじさんが該当する。',
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
      catchline: '全て揃っているのに<br><span class="hl">体だけ</span>が壊れているタイプ',
      description: '稼いでいて友達もいて時間もあるのに<br><span class="hl">健康診断</span>がオールC。<br>飲み会が多い経営者や<br>運動不足の在宅ワーカーが該当する。',
      quote: '肉体は有限、お金では買えない',
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
      catchline: 'お金も時間もあるのに<br><span class="hl">世界から孤立</span>しているタイプ',
      description: '投資で稼いでいるが<br>友達ゼロで体もボロボロの<br><span class="hl">引きこもり</span>が該当する。<br>豊かな繭の中でひとり。',
      quote: '繭を破れば世界が変わる',
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
      catchline: 'お金はないが<br><span class="hl">圧倒的に時間がある</span>タイプ',
      description: '実家ぐらしの<span class="hl">ニート</span>か、<br>旦那の金で遊ぶ<span class="hl">主婦</span>が該当する。<br>お金より大切なものを<br>すでに手に入れている。',
      quote: '月を眺める余裕がある自由人',
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
      catchline: 'かつての栄光は消え<br><span class="hl">時間と健康</span>だけが残ったタイプ',
      description: '元大企業勤めだが<span class="hl">リストラ</span>されて<br>今は無職。友達も離れていった。<br>でも体は健康で暇だけはある<br>孤独なおじさんが該当する。',
      quote: '体が動く限り逆転はできる',
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
      catchline: '仲間はいるが<br><span class="hl">体がついてこない</span>タイプ',
      description: 'バイト週3で暮らしていて<br><span class="hl">遊ぶ友達</span>はいるが<br>運動不足で体はボロボロ。<br>マイペースだが<span class="hl">不摂生</span>なフリーターが該当。',
      quote: 'ゆっくり生きるが体は待ってくれない',
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
      catchline: '<span class="hl">時間だけ</span>はたっぷりある<br>引きこもりタイプ',
      description: '親の家でゲームしてるだけの<br><span class="hl">完全引きこもり</span>。<br>友達もいないし体力もない。<br>でも時間だけは無限にある。',
      quote: '殻の中は居心地がいい',
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
      catchline: '家族にも恵まれ<span class="hl">高収入</span><br>でも<span class="hl">時間がない</span>タイプ',
      description: '平日、土日ともに<br>プライベートと仕事の予定で<br><span class="hl">時間に追われている</span>ことが多い。<br>大企業の管理職に多い。',
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
      catchline: '稼いでいるが<br><span class="hl">友達ゼロで激務</span>のタイプ',
      description: '年収は高いが<span class="hl">毎日終電</span>で<br>友達と会う暇もない。<br>会社の同僚としか話さない<br>独身サラリーマンが該当する。',
      quote: '剣を振るい続ける孤独な勇者',
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
      catchline: '稼いでいるが<br><span class="hl">体か人間関係</span>を犠牲にしたタイプ',
      description: '要領よく出世してきたが<br><span class="hl">健康診断</span>は再検査だらけ。<br>忙しすぎて家族との関係も<br>冷え切っている管理職が該当。',
      quote: '大切なものとすり替わっていた',
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
      catchline: '<span class="hl">お金だけ</span>が積み上がり<br>他は全部失ったタイプ',
      description: '朝から晩まで<span class="hl">仕事漬け</span>で<br>通帳の数字だけが増えていく。<br>友達は取引先だけ、<br>最後に運動したのはいつだっけ？',
      quote: '何のために稼いできたのか',
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
      catchline: '金はないが<br><span class="hl">仲間と健康</span>だけはあるタイプ',
      description: '地元の<span class="hl">仲間と毎週BBQ</span>してる<br>低収入だが楽しそうなおじさん。<br>時間はないが人望だけは厚い<br>町内会のリーダーが該当する。',
      quote: '貧しくても今日も笑える豊かさ',
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
      catchline: '<span class="hl">健康な体一つ</span>で<br>何も持たずに生きるタイプ',
      description: '住所不定の<span class="hl">日雇い労働者</span>や<br>旅を続ける放浪者が該当する。<br>荷物を持たないからこそ<br>どこへでも行ける。',
      quote: '身軽さが最大の武器',
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
      catchline: '全部失ったが<br><span class="hl">仲間だけ</span>は残っているタイプ',
      description: '借金まみれで体もボロボロだが<br><span class="hl">飲み友達</span>だけは来てくれる。<br>かつては輝いていた<br>元営業マンが該当する。',
      quote: '粘り強さと仲間が逆転の武器',
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
      catchline: '<span class="hl">すべて</span>が<br>底をついたタイプ',
      description: '金なし、時間なし、友達なし、<br><span class="hl">健康もなし</span>。<br>それでも今日も生きている。<br>ここからが本当のスタート。',
      quote: '生きているだけで可能性がある',
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
      // 概要カード
      await generateCard(page, card, preset.theme);
      fs.copyFileSync(
        path.join(OUTPUT_DIR, card.filename + ".png"),
        path.join(presetDir, `${String(slideNum).padStart(2, "0")}_${card.filename}.png`)
      );
      slideNum++;
      // ペルソナカード
      if (card.persona) {
        await generatePersona(page, card, preset.theme);
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
