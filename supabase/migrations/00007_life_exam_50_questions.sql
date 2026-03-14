-- Ver1: 50問化（5教科×10問）。既存1-25を更新、26-50を追加
-- 教科対応: subject_id 1=経済, 2=意味, 3=関係, 4=自由, 5=心理

-- ========== 経済 (subject_id 1, id 1-5 を更新) ==========
UPDATE life_exam_questions SET label = '現在の年収レンジは？', response_type = '5' WHERE id = 1;
UPDATE life_exam_questions SET label = '貯蓄額は？', response_type = '5' WHERE id = 2;
UPDATE life_exam_questions SET label = '毎月の貯蓄率は？', response_type = '5' WHERE id = 3;
UPDATE life_exam_questions SET label = '投資経験は？', response_type = '5' WHERE id = 4;
UPDATE life_exam_questions SET label = 'お金の勉強は？', response_type = '4' WHERE id = 5;

-- ========== 意味 (subject_id 2, id 6-10 を更新) ==========
UPDATE life_exam_questions SET label = '人生の目標は？', response_type = '4' WHERE id = 6;
UPDATE life_exam_questions SET label = '働く理由は？', response_type = '4' WHERE id = 7;
UPDATE life_exam_questions SET label = '尊敬する人は？', response_type = '4' WHERE id = 8;
UPDATE life_exam_questions SET label = '5年後の自分像は？', response_type = '4' WHERE id = 9;
UPDATE life_exam_questions SET label = '学習習慣は？', response_type = '4' WHERE id = 10;

-- ========== 関係 (subject_id 3, id 11-15 を更新) ==========
UPDATE life_exam_questions SET label = '相談できる友人は何人いますか？', response_type = '4' WHERE id = 11;
UPDATE life_exam_questions SET label = '困ったとき助けてくれる人はいますか？', response_type = '4' WHERE id = 12;
UPDATE life_exam_questions SET label = '初対面の場は得意ですか？', response_type = '4' WHERE id = 13;
UPDATE life_exam_questions SET label = '友人関係の満足度は？', response_type = '4' WHERE id = 14;
UPDATE life_exam_questions SET label = '家族との関係は？', response_type = '4' WHERE id = 15;

-- ========== 自由 (subject_id 4, id 16-20 を更新) ==========
UPDATE life_exam_questions SET label = '平日の自由時間は？', response_type = '4' WHERE id = 16;
UPDATE life_exam_questions SET label = '休日の過ごし方は？', response_type = '4' WHERE id = 17;
UPDATE life_exam_questions SET label = '1日のスマホ時間は？', response_type = '4' WHERE id = 18;
UPDATE life_exam_questions SET label = '他人に時間を奪われる感覚は？', response_type = '4' WHERE id = 19;
UPDATE life_exam_questions SET label = 'やりたいことに使える時間は？', response_type = '4' WHERE id = 20;

-- ========== 心理 (subject_id 5, id 21-25 を更新) ==========
UPDATE life_exam_questions SET label = '不安の強さは？', response_type = '4' WHERE id = 21;
UPDATE life_exam_questions SET label = '自己肯定感は？', response_type = '4' WHERE id = 22;
UPDATE life_exam_questions SET label = '他人と比較する？', response_type = '4' WHERE id = 23;
UPDATE life_exam_questions SET label = '失敗したら？', response_type = '4' WHERE id = 24;
UPDATE life_exam_questions SET label = '孤独は？', response_type = '4' WHERE id = 25;

-- ========== 経済 6-10 (subject_id 1) ==========
INSERT INTO life_exam_questions (subject_id, sort_order, label, response_type) VALUES
(1, 6, '収入源の数は？', '4'),
(1, 7, '高額購入時の判断は？', '4'),
(1, 8, 'お金の不安は？', '4'),
(1, 9, '他人の年収は？', '4'),
(1, 10, '収入が半減したら？', '4');

-- ========== 意味 6-10 (subject_id 2) ==========
INSERT INTO life_exam_questions (subject_id, sort_order, label, response_type) VALUES
(2, 6, '挑戦頻度は？', '4'),
(2, 7, '社会への関心は？', '4'),
(2, 8, '失敗を？', '4'),
(2, 9, '日々の行動は目標と？', '4'),
(2, 10, '今の人生は？', '4');

-- ========== 関係 6-10 (subject_id 3) ==========
INSERT INTO life_exam_questions (subject_id, sort_order, label, response_type) VALUES
(3, 6, '家族に本音を話せますか？', '4'),
(3, 7, '家族と過ごす時間は？', '4'),
(3, 8, '現在の親密なパートナーとの関係は？', '4'),
(3, 9, '感情を本音で話せる相手は？', '4'),
(3, 10, '親密関係での自立度は？', '4');

-- ========== 自由 6-10 (subject_id 4) ==========
INSERT INTO life_exam_questions (subject_id, sort_order, label, response_type) VALUES
(4, 6, '睡眠時間は？', '4'),
(4, 7, '仕事を辞めたら？', '4'),
(4, 8, '締切対応は？', '4'),
(4, 9, '将来の時間不安は？', '4'),
(4, 10, '1日24時間は？', '4');

-- ========== 心理 6-10 (subject_id 5) ==========
INSERT INTO life_exam_questions (subject_id, sort_order, label, response_type) VALUES
(5, 6, 'ストレス対処法は？', '4'),
(5, 7, '睡眠の質は？', '4'),
(5, 8, '将来への期待は？', '4'),
(5, 9, '怒りの扱いは？', '4'),
(5, 10, '今の自分を？', '4');
