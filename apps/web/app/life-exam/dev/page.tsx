"use client";

/**
 * DEV: 80ペルソナ診断テストページ（16キャラクター × 5人）
 * アクセス: /life-exam/dev
 */

import { diagnoseFromScores, getCharacterResult, SCORE_THRESHOLDS } from "@/lib/life-diagnosis";

interface Persona {
  name: string;
  age: number;
  occupation: string;
  scores: { 1: number; 2: number; 3: number; 4: number; 5: number };
  expectedCode: string;
  note: string;
}

const PERSONAS: Persona[] = [
  // ─── MFCH: イカロス ─────────────────────────────────────────
  { name: "山田 太郎", age: 45, occupation: "起業家・代表取締役",
    scores: { 1: 75, 2: 85, 3: 70, 4: 70, 5: 72 }, expectedCode: "MFCH",
    note: "事業成功・充実した人脈・健康管理も万全" },
  { name: "橘 誠一郎", age: 38, occupation: "医師+投資家",
    scores: { 1: 72, 2: 85, 3: 68, 4: 58, 5: 70 }, expectedCode: "MFCH",
    note: "本業と資産運用を両立し豊かな人脈を持つ" },
  { name: "西村 光雄", age: 52, occupation: "会社創業者",
    scores: { 1: 85, 2: 75, 3: 72, 4: 65, 5: 68 }, expectedCode: "MFCH",
    note: "50代で会社を軌道に乗せ4つの資本がそろった" },
  { name: "坂本 隼人", age: 34, occupation: "ベンチャー経営者",
    scores: { 1: 70, 2: 78, 3: 75, 4: 68, 5: 66 }, expectedCode: "MFCH",
    note: "30代で全軸バランス良く整えた新世代" },
  { name: "藤田 一朗", age: 60, occupation: "実業家・慈善活動家",
    scores: { 1: 82, 2: 68, 3: 72, 4: 70, 5: 72 }, expectedCode: "MFCH",
    note: "60代で人生のすべてを手に入れた経営者" },

  // ─── MFLH: 孤独な大王 ────────────────────────────────────────
  { name: "鈴木 誠", age: 42, occupation: "ITエンジニア・個人事業主",
    scores: { 1: 80, 2: 82, 3: 30, 4: 65, 5: 70 }, expectedCode: "MFLH",
    note: "稼ぎと時間はあるが人付き合いをほぼしない" },
  { name: "黒田 竜也", age: 36, occupation: "デイトレーダー",
    scores: { 1: 75, 2: 80, 3: 28, 4: 70, 5: 68 }, expectedCode: "MFLH",
    note: "在宅で稼ぐが友人ゼロ・健康は維持している" },
  { name: "池田 研二", age: 50, occupation: "オーナー社長",
    scores: { 1: 90, 2: 60, 3: 30, 4: 55, 5: 72 }, expectedCode: "MFLH",
    note: "資産は圧倒的だが孤高を好み孤独に生きる" },
  { name: "岩本 隆", age: 44, occupation: "AI研究者",
    scores: { 1: 60, 2: 75, 3: 35, 4: 65, 5: 70 }, expectedCode: "MFLH",
    note: "研究に没頭し人間関係を意図的に遮断" },
  { name: "早川 大", age: 30, occupation: "暗号資産トレーダー",
    scores: { 1: 70, 2: 82, 3: 20, 4: 60, 5: 68 }, expectedCode: "MFLH",
    note: "若くして資産を築いたが人間関係は皆無" },

  // ─── MFCS: スフィンクス ──────────────────────────────────────
  { name: "佐藤 洋介", age: 47, occupation: "証券アナリスト",
    scores: { 1: 70, 2: 80, 3: 65, 4: 60, 5: 45 }, expectedCode: "MFCS",
    note: "高収入・人脈あり・時間の余裕もあるが健康を酷使" },
  { name: "三宅 雄太", age: 41, occupation: "外資コンサルタント",
    scores: { 1: 68, 2: 82, 3: 68, 4: 58, 5: 40 }, expectedCode: "MFCS",
    note: "仕事も人間関係も充実しているが体がついていかない" },
  { name: "阿部 亮介", age: 49, occupation: "マーケティング役員",
    scores: { 1: 72, 2: 75, 3: 70, 4: 62, 5: 50 }, expectedCode: "MFCS",
    note: "全方位に活躍しているが健康だけが弱点" },
  { name: "長谷川 翔", age: 35, occupation: "人気YouTuber",
    scores: { 1: 65, 2: 78, 3: 72, 4: 65, 5: 35 }, expectedCode: "MFCS",
    note: "収入・人脈・時間はあるが不規則な生活で体が悲鳴" },
  { name: "内田 博史", age: 58, occupation: "国会議員",
    scores: { 1: 80, 2: 72, 3: 75, 4: 55, 5: 45 }, expectedCode: "MFCS",
    note: "社会的地位と人脈は最高水準だが疲労が慢性化" },

  // ─── MFLS: カイコ ────────────────────────────────────────────
  { name: "伊藤 博", age: 52, occupation: "孤独な投資家",
    scores: { 1: 80, 2: 78, 3: 25, 4: 62, 5: 40 }, expectedCode: "MFLS",
    note: "資産と時間はあるが体も人間関係も壊れている" },
  { name: "村上 哲也", age: 48, occupation: "投資銀行家",
    scores: { 1: 82, 2: 88, 3: 22, 4: 58, 5: 38 }, expectedCode: "MFLS",
    note: "金融の頂点にいるが身体と人間関係は崩壊" },
  { name: "高野 淳", age: 55, occupation: "孤独な自営業",
    scores: { 1: 75, 2: 70, 3: 28, 4: 60, 5: 42 }, expectedCode: "MFLS",
    note: "一人で商売して稼いでいるが孤独で病気がち" },
  { name: "斉藤 浩一", age: 39, occupation: "海外出張族・管理職",
    scores: { 1: 72, 2: 80, 3: 30, 4: 55, 5: 50 }, expectedCode: "MFLS",
    note: "収入は高く時間もあるが出張三昧で孤立・体は中程度" },
  { name: "石田 正雄", age: 62, occupation: "元大手企業役員",
    scores: { 1: 85, 2: 65, 3: 25, 4: 62, 5: 42 }, expectedCode: "MFLS",
    note: "退職金と資産はあるが老後は孤独で健康も不安" },

  // ─── PFCH: ツクヨミ ──────────────────────────────────────────
  { name: "中村 健太", age: 35, occupation: "地方公務員",
    scores: { 1: 35, 2: 42, 3: 65, 4: 68, 5: 70 }, expectedCode: "PFCH",
    note: "収入は低いが仕事後の時間・友人・健康に恵まれている" },
  { name: "土屋 美春", age: 28, occupation: "保育士",
    scores: { 1: 30, 2: 38, 3: 70, 4: 68, 5: 72 }, expectedCode: "PFCH",
    note: "低収入でも豊かな人間関係と健康が支え" },
  { name: "宮本 和彦", age: 42, occupation: "農家",
    scores: { 1: 32, 2: 40, 3: 65, 4: 75, 5: 68 }, expectedCode: "PFCH",
    note: "自給自足に近い生活で金はないが充実している" },
  { name: "福島 哲", age: 58, occupation: "定年退職者",
    scores: { 1: 40, 2: 30, 3: 68, 4: 80, 5: 70 }, expectedCode: "PFCH",
    note: "退職後に地域活動・健康・趣味が充実" },
  { name: "小川 祐介", age: 24, occupation: "大学院生",
    scores: { 1: 15, 2: 28, 3: 62, 4: 72, 5: 66 }, expectedCode: "PFCH",
    note: "お金はないが友人・自由時間・健康に恵まれた学生" },

  // ─── PFLH: 没落貴族 ──────────────────────────────────────────
  { name: "小林 俊介", age: 48, occupation: "フリーランスデザイナー",
    scores: { 1: 30, 2: 45, 3: 30, 4: 68, 5: 70 }, expectedCode: "PFLH",
    note: "時間と健康はあるが収入が不安定・孤立している" },
  { name: "原田 誠司", age: 45, occupation: "元会社員・無収入",
    scores: { 1: 28, 2: 42, 3: 28, 4: 70, 5: 68 }, expectedCode: "PFLH",
    note: "体と時間はあるが仕事も友人もなく孤独" },
  { name: "谷口 拓", age: 36, occupation: "世界一周旅人",
    scores: { 1: 20, 2: 40, 3: 25, 4: 80, 5: 70 }, expectedCode: "PFLH",
    note: "旅の自由と健康はあるが財産も人脈も薄い" },
  { name: "今井 進", age: 60, occupation: "年金生活者",
    scores: { 1: 40, 2: 25, 3: 30, 4: 75, 5: 72 }, expectedCode: "PFLH",
    note: "健康で時間はあるが年金のみで孤独な老後" },
  { name: "古川 直樹", age: 30, occupation: "自主制作映像作家",
    scores: { 1: 22, 2: 45, 3: 28, 4: 68, 5: 68 }, expectedCode: "PFLH",
    note: "健康・時間はあり収入も少しあるが孤立している" },

  // ─── PFCS: ナマケモノ ────────────────────────────────────────
  { name: "加藤 大輔", age: 30, occupation: "アルバイト",
    scores: { 1: 25, 2: 38, 3: 60, 4: 70, 5: 45 }, expectedCode: "PFCS",
    note: "お金はないが友人に恵まれ自由な時間がある・健康は不安" },
  { name: "上田 翔太", age: 26, occupation: "バンドマン",
    scores: { 1: 18, 2: 35, 3: 65, 4: 75, 5: 42 }, expectedCode: "PFCS",
    note: "仲間と音楽をやるが体は酷使・収入は最低限" },
  { name: "桑原 豊", age: 40, occupation: "在宅ライター",
    scores: { 1: 28, 2: 40, 3: 68, 4: 72, 5: 50 }, expectedCode: "PFCS",
    note: "人脈と時間はあるが収入は低く体も万全でない" },
  { name: "安田 真一", age: 55, occupation: "元芸術家",
    scores: { 1: 22, 2: 32, 3: 60, 4: 68, 5: 55 }, expectedCode: "PFCS",
    note: "仲間はいて時間もあるが稼ぎと体に課題" },
  { name: "奥村 健", age: 33, occupation: "地域おこし協力隊",
    scores: { 1: 20, 2: 38, 3: 72, 4: 65, 5: 48 }, expectedCode: "PFCS",
    note: "地域に溶け込み仲間は多いが収入と健康が弱い" },

  // ─── PFLS: カタツムリ ────────────────────────────────────────
  { name: "吉田 雄介", age: 28, occupation: "フリーター",
    scores: { 1: 20, 2: 32, 3: 30, 4: 65, 5: 40 }, expectedCode: "PFLS",
    note: "時間だけはある。お金・人間関係・健康すべて低水準" },
  { name: "久保 誠", age: 24, occupation: "ニート",
    scores: { 1: 10, 2: 18, 3: 28, 4: 85, 5: 40 }, expectedCode: "PFLS",
    note: "暇だけはある。すべての資本が底を打っている" },
  { name: "成田 哲", age: 35, occupation: "引きこもり歴5年",
    scores: { 1: 15, 2: 25, 3: 20, 4: 72, 5: 45 }, expectedCode: "PFLS",
    note: "時間はたっぷりあるが何もできていない" },
  { name: "浜田 直人", age: 48, occupation: "無気力会社員",
    scores: { 1: 30, 2: 45, 3: 28, 4: 55, 5: 55 }, expectedCode: "PFLS",
    note: "辛うじて働いているが時間以外に誇れるものがない" },
  { name: "竹内 剛", age: 31, occupation: "アーティスト志望",
    scores: { 1: 12, 2: 30, 3: 25, 4: 75, 5: 48 }, expectedCode: "PFLS",
    note: "夢だけ持って自由な時間に浸るが現実が伴わない" },

  // ─── MBCH: ドワーフの王 ──────────────────────────────────────
  { name: "渡辺 浩", age: 43, occupation: "製造業・工場長",
    scores: { 1: 72, 2: 78, 3: 65, 4: 30, 5: 70 }, expectedCode: "MBCH",
    note: "高収入・人脈あり・健康だが仕事が忙しすぎて時間なし" },
  { name: "野村 勝", age: 38, occupation: "外資金融・激務",
    scores: { 1: 68, 2: 82, 3: 65, 4: 25, 5: 68 }, expectedCode: "MBCH",
    note: "高収入・充実した人脈・健康だが時間だけが犠牲に" },
  { name: "平田 幸雄", age: 50, occupation: "銀行支店長",
    scores: { 1: 80, 2: 72, 3: 62, 4: 20, 5: 70 }, expectedCode: "MBCH",
    note: "地位と人脈と健康はあるが会議漬けで時間ゼロ" },
  { name: "清野 章", age: 34, occupation: "外科医・院長補佐",
    scores: { 1: 65, 2: 78, 3: 70, 4: 30, 5: 70 }, expectedCode: "MBCH",
    note: "技術職として報酬と信頼を得るが激務で時間なし" },
  { name: "丸山 信也", age: 45, occupation: "建設会社社長",
    scores: { 1: 75, 2: 68, 3: 60, 4: 28, 5: 68 }, expectedCode: "MBCH",
    note: "現場・経営・健康は万全だが時間だけが欠けている" },

  // ─── MBLH: 騎士 ──────────────────────────────────────────────
  { name: "田中 修", age: 39, occupation: "外科医",
    scores: { 1: 70, 2: 82, 3: 30, 4: 25, 5: 68 }, expectedCode: "MBLH",
    note: "高収入・健康だが激務で時間ゼロ・孤立している" },
  { name: "大島 翼", age: 45, occupation: "弁護士",
    scores: { 1: 72, 2: 85, 3: 28, 4: 20, 5: 68 }, expectedCode: "MBLH",
    note: "依頼人への奉仕に費やし自分の時間も友人もない" },
  { name: "片山 航", age: 36, occupation: "国際線パイロット",
    scores: { 1: 70, 2: 80, 3: 35, 4: 30, 5: 70 }, expectedCode: "MBLH",
    note: "稼いで健康だが不規則勤務で時間も人間関係も薄い" },
  { name: "菊池 誠一", age: 52, occupation: "大企業本部長",
    scores: { 1: 75, 2: 78, 3: 30, 4: 25, 5: 66 }, expectedCode: "MBLH",
    note: "昇進と健康は手に入れたが家族も友人も遠くなった" },
  { name: "尾崎 裕二", age: 29, occupation: "戦略コンサル",
    scores: { 1: 55, 2: 72, 3: 38, 4: 28, 5: 68 }, expectedCode: "MBLH",
    note: "若手エース・稼ぎと健康はあるが孤独で激務" },

  // ─── MBCS: タヌキ ────────────────────────────────────────────
  { name: "松本 隆", age: 41, occupation: "営業マネージャー",
    scores: { 1: 65, 2: 72, 3: 62, 4: 28, 5: 40 }, expectedCode: "MBCS",
    note: "稼ぎと人間関係はあるが激務で時間なし・体が悲鳴" },
  { name: "宮田 昭", age: 36, occupation: "広告代理店プランナー",
    scores: { 1: 62, 2: 75, 3: 65, 4: 28, 5: 42 }, expectedCode: "MBCS",
    note: "クリエイティブで人脈豊富だが不規則生活で体ぼろぼろ" },
  { name: "後藤 政義", age: 48, occupation: "地方議員",
    scores: { 1: 70, 2: 65, 3: 68, 4: 22, 5: 50 }, expectedCode: "MBCS",
    note: "地域の顔役で人脈と収入はあるが健康と時間がない" },
  { name: "永井 雅人", age: 33, occupation: "不動産営業",
    scores: { 1: 58, 2: 72, 3: 62, 4: 30, 5: 55 }, expectedCode: "MBCS",
    note: "稼ぎと人脈はあるが体と時間が見合っていない" },
  { name: "小野 裕司", age: 55, occupation: "中小企業経営者",
    scores: { 1: 75, 2: 65, 3: 60, 4: 25, 5: 48 }, expectedCode: "MBCS",
    note: "30年かけて会社を育てたが体と時間を使い果たした" },

  // ─── MBLS: フンコロガシ ──────────────────────────────────────
  { name: "木村 浩二", age: 38, occupation: "工場勤務",
    scores: { 1: 60, 2: 68, 3: 28, 4: 30, 5: 40 }, expectedCode: "MBLS",
    note: "稼いでいるが全部仕事に持っていかれている" },
  { name: "星野 哲", age: 35, occupation: "土木作業員",
    scores: { 1: 62, 2: 68, 3: 22, 4: 25, 5: 55 }, expectedCode: "MBLS",
    note: "現場仕事でそこそこ稼ぐが体は消耗・孤立している" },
  { name: "金子 勝", age: 44, occupation: "タクシー運転手",
    scores: { 1: 58, 2: 65, 3: 30, 4: 28, 5: 45 }, expectedCode: "MBLS",
    note: "稼いでいるが夜勤で時間も体も友人も犠牲に" },
  { name: "荒木 忠男", age: 51, occupation: "長距離トラック運転手",
    scores: { 1: 60, 2: 70, 3: 25, 4: 30, 5: 42 }, expectedCode: "MBLS",
    note: "収入は安定しているが孤独な長距離生活で体も限界" },
  { name: "柴田 賢二", age: 38, occupation: "夜勤警備員",
    scores: { 1: 55, 2: 65, 3: 28, 4: 22, 5: 48 }, expectedCode: "MBLS",
    note: "稼ぎは安定しているが夜勤で人間関係も体も壊れている" },

  // ─── PBCH: オークの族長 ──────────────────────────────────────
  { name: "清水 功", age: 33, occupation: "介護士",
    scores: { 1: 22, 2: 40, 3: 70, 4: 35, 5: 70 }, expectedCode: "PBCH",
    note: "給料は安く時間もないが仲間と健康に恵まれている" },
  { name: "宇野 一郎", age: 28, occupation: "消防士",
    scores: { 1: 25, 2: 42, 3: 68, 4: 30, 5: 70 }, expectedCode: "PBCH",
    note: "仲間意識が強く健康だが収入と時間は足りない" },
  { name: "前田 義雄", age: 45, occupation: "農協職員",
    scores: { 1: 28, 2: 38, 3: 72, 4: 35, 5: 68 }, expectedCode: "PBCH",
    note: "地域コミュニティの中心人物だが給料は低く多忙" },
  { name: "飯田 哲夫", age: 55, occupation: "元中学教師",
    scores: { 1: 32, 2: 40, 3: 70, 4: 25, 5: 72 }, expectedCode: "PBCH",
    note: "教え子との絆と健康は財産だが収入と時間は乏しい" },
  { name: "大沢 浩", age: 38, occupation: "NPO代表",
    scores: { 1: 20, 2: 35, 3: 65, 4: 28, 5: 68 }, expectedCode: "PBCH",
    note: "社会貢献と仲間はあるが金なし・時間なしで常に多忙" },

  // ─── PBLH: 流れ者 ────────────────────────────────────────────
  { name: "山口 誠", age: 31, occupation: "日雇い労働者",
    scores: { 1: 20, 2: 38, 3: 28, 4: 35, 5: 68 }, expectedCode: "PBLH",
    note: "体だけは丈夫。お金・時間・人間関係すべて厳しい" },
  { name: "末永 章", age: 25, occupation: "バックパッカー",
    scores: { 1: 15, 2: 30, 3: 25, 4: 30, 5: 70 }, expectedCode: "PBLH",
    note: "健康だけを武器に世界を流れる。残りは何もない" },
  { name: "国分 勇", age: 45, occupation: "元サラリーマン・無職",
    scores: { 1: 30, 2: 40, 3: 28, 4: 30, 5: 68 }, expectedCode: "PBLH",
    note: "会社を辞め健康だけ保っているが後は何もない" },
  { name: "浦田 修平", age: 55, occupation: "元漁師",
    scores: { 1: 22, 2: 35, 3: 30, 4: 28, 5: 72 }, expectedCode: "PBLH",
    note: "海で鍛えた体はあるが廃業後は孤独で収入もない" },
  { name: "朝倉 仁", age: 32, occupation: "農業研修生",
    scores: { 1: 18, 2: 38, 3: 22, 4: 35, 5: 68 }, expectedCode: "PBLH",
    note: "健康だけを頼りに農業に賭けるが今は何もない" },

  // ─── PBCS: ハイエナ ──────────────────────────────────────────
  { name: "林 拓也", age: 27, occupation: "非正規派遣社員",
    scores: { 1: 22, 2: 35, 3: 62, 4: 30, 5: 35 }, expectedCode: "PBCS",
    note: "友人はいるがお金・時間・健康がそろっていない" },
  { name: "高橋 誠", age: 24, occupation: "フリーター",
    scores: { 1: 20, 2: 32, 3: 65, 4: 28, 5: 40 }, expectedCode: "PBCS",
    note: "友人は多いがお金も体もなく将来が見えない" },
  { name: "岡田 浩二", age: 38, occupation: "失業中",
    scores: { 1: 25, 2: 38, 3: 68, 4: 30, 5: 45 }, expectedCode: "PBCS",
    note: "人間関係だけが支えだが経済・健康・時間が苦しい" },
  { name: "山崎 光", age: 45, occupation: "シングル介護中",
    scores: { 1: 18, 2: 35, 3: 70, 4: 25, 5: 50 }, expectedCode: "PBCS",
    note: "家族と仲間には恵まれているが経済・健康・時間が犠牲" },
  { name: "桐島 洋", age: 30, occupation: "ボランティア活動家",
    scores: { 1: 15, 2: 30, 3: 72, 4: 35, 5: 40 }, expectedCode: "PBCS",
    note: "コミュニティへの貢献はあるが自分の生活は最低限" },

  // ─── PBLS: 蚊 ────────────────────────────────────────────────
  { name: "橋本 純", age: 26, occupation: "無職",
    scores: { 1: 15, 2: 22, 3: 28, 4: 28, 5: 30 }, expectedCode: "PBLS",
    note: "すべての資本が底をついている状態" },
  { name: "阿久津 修", age: 22, occupation: "中退した大学生",
    scores: { 1: 10, 2: 15, 3: 20, 4: 28, 5: 35 }, expectedCode: "PBLS",
    note: "なにも持たずに漂っている" },
  { name: "廣瀬 誠", age: 35, occupation: "長期引きこもり",
    scores: { 1: 8, 2: 18, 3: 15, 4: 25, 5: 28 }, expectedCode: "PBLS",
    note: "社会との接点がほぼない・体も限界に近い" },
  { name: "辻 一郎", age: 48, occupation: "破産申請中",
    scores: { 1: 5, 2: 20, 3: 22, 4: 20, 5: 38 }, expectedCode: "PBLS",
    note: "事業失敗後にすべてを失い再起が見えない" },
  { name: "島田 良", age: 31, occupation: "閉塞した非正規",
    scores: { 1: 18, 2: 25, 3: 25, 4: 30, 5: 32 }, expectedCode: "PBLS",
    note: "何かを変えたいが変える手がかりがない" },
];

// ─── 定数 ──────────────────────────────────────────────────────────────────

const CODE_TO_ID: Record<string, string> = {
  MFCH: "icarus",    MFLH: "king",      MFCS: "egyptian_cat", MFLS: "kaiko",
  PFCH: "tsukuyomi", PFLH: "noble",     PFCS: "namakemono",   PFLS: "snail",
  MBCH: "dwarf_king",MBLH: "knight",    MBCS: "tanuki",       MBLS: "beetle",
  PBCH: "goblin_king",PBLH: "wanderer", PBCS: "hyena",        PBLS: "mosquito",
};

const SUBJECT_LABELS: Record<number, string> = {
  1: "資産", 2: "収入", 3: "人間関係", 4: "時間", 5: "健康",
};

const THRESHOLDS_BY_SUBJECT: Record<number, number> = {
  1: SCORE_THRESHOLDS.financial,
  2: SCORE_THRESHOLDS.financial,
  3: SCORE_THRESHOLDS.relationship,
  4: SCORE_THRESHOLDS.time,
  5: SCORE_THRESHOLDS.health,
};

// ─── コンポーネント ──────────────────────────────────────────────────────────

function ScoreBar({ subjectId, score }: { subjectId: number; score: number }) {
  const threshold = THRESHOLDS_BY_SUBJECT[subjectId];
  const isGood = score >= threshold;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] text-[#9A9290]">{SUBJECT_LABELS[subjectId]}</span>
      <div className="relative flex-1 h-1.5 rounded-full bg-[#E8DDD0]">
        <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: isGood ? "#43756B" : "#F57550" }} />
        <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: `${threshold}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-[10px] font-bold tabular-nums" style={{ color: isGood ? "#43756B" : "#F57550" }}>
        {score}
      </span>
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────────────────────────

export default function PersonasDevPage() {
  // 全ペルソナの判定
  const results = PERSONAS.map((persona) => {
    const characterId = diagnoseFromScores(persona.scores);
    const characterResult = getCharacterResult(characterId);
    const s = persona.scores;
    const financial = Math.max(s[1], s[2]);
    const m = financial >= SCORE_THRESHOLDS.financial    ? "M" : "P";
    const f = s[4]    >= SCORE_THRESHOLDS.time           ? "F" : "B";
    const c = s[3]    >= SCORE_THRESHOLDS.relationship   ? "C" : "L";
    const h = s[5]    >= SCORE_THRESHOLDS.health         ? "H" : "S";
    const actualCode = `${m}${f}${c}${h}`;
    return { persona, characterResult, actualCode, isMatch: actualCode === persona.expectedCode };
  });

  // キャラクター別にグループ化（定義順を保持）
  const groups = Object.entries(CODE_TO_ID).map(([code, _id]) => ({
    code,
    rows: results.filter((r) => r.persona.expectedCode === code),
  }));

  const passCount = results.filter((r) => r.isMatch).length;
  const total = results.length;

  return (
    <div className="min-h-screen bg-[#F7F4F0]">
      {/* ─── ヘッダー ─── */}
      <div className="sticky top-0 z-10 border-b border-[#E8DDD0] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#FFE4DC] px-2 py-0.5 text-xs font-bold text-[#F57550]">DEV</span>
            <span className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif" }}>
              {total}ペルソナ診断テスト（16キャラクター × 5人）
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9A9290]">判定一致:</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: passCount === total ? "#43756B" : "#F57550" }}>
              {passCount} / {total}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 pb-12">
        {/* ─── 閾値 ─── */}
        <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-[#E8DDD0] bg-white px-4 py-3 text-xs text-[#706860]">
          <span className="font-bold text-[#333333]">閾値:</span>
          <span>金融（資産・収入） ≥ {SCORE_THRESHOLDS.financial}</span>
          <span>·</span>
          <span>時間 ≥ {SCORE_THRESHOLDS.time}</span>
          <span>·</span>
          <span>人間関係 ≥ {SCORE_THRESHOLDS.relationship}</span>
          <span>·</span>
          <span>健康 ≥ {SCORE_THRESHOLDS.health}</span>
          <span className="text-[#9A9290]">（バーの白線が閾値位置）</span>
        </div>

        {/* ─── キャラクター別グループ ─── */}
        <div className="space-y-8">
          {groups.map(({ code, rows }) => {
            if (rows.length === 0) return null;
            const char = rows[0].characterResult;
            const groupPass = rows.filter((r) => r.isMatch).length;
            return (
              <div key={code}>
                {/* グループヘッダー */}
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src={char.imagePath}
                    alt={char.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white"
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 15 }}>
                        {char.name}
                      </span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                        style={{ fontFamily: "monospace", background: "#F5F0EB", color: "#333333", letterSpacing: "0.1em" }}>
                        {code}
                      </span>
                      <span className="text-xs font-bold" style={{ color: groupPass === rows.length ? "#43756B" : "#F57550" }}>
                        {groupPass}/{rows.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#9A9290]">{char.world}</p>
                  </div>
                </div>

                {/* ペルソナカード（横並び5枚） */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {rows.map(({ persona, actualCode, isMatch }) => (
                    <div
                      key={persona.name}
                      className="rounded-xl border bg-white p-3"
                      style={{ borderColor: isMatch ? "#C8DDD8" : "#F57550", borderWidth: 1.5 }}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="font-bold text-[#333333]" style={{ fontFamily: "var(--font-noto-serif-jp), serif", fontSize: 12 }}>
                            {persona.name}
                          </p>
                          <p className="text-[10px] text-[#9A9290]">{persona.age}歳</p>
                          <p className="text-[10px] text-[#9A9290]">{persona.occupation}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-base">{isMatch ? "✅" : "❌"}</span>
                          <span className="rounded px-1 py-0.5 text-[9px] font-bold tabular-nums"
                            style={{
                              fontFamily: "monospace",
                              background: isMatch ? "#E8F5F3" : "#FFE4DC",
                              color: isMatch ? "#43756B" : "#F57550",
                              letterSpacing: "0.08em",
                            }}>
                            {actualCode}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {([1, 2, 3, 4, 5] as const).map((sid) => (
                          <ScoreBar key={sid} subjectId={sid} score={persona.scores[sid]} />
                        ))}
                      </div>

                      <p className="mt-2 text-[10px] italic text-[#9A9290]"
                        style={{ fontFamily: "var(--font-noto-serif-jp), serif", lineHeight: 1.5 }}>
                        {persona.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
