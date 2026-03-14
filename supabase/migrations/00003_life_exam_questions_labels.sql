-- 25問の設問文を更新（5科目・各5問）

-- 金融資本 (subject_id = 1, question id 1-5)
UPDATE life_exam_questions SET label = '貯金・資産に余裕がある' WHERE id = 1;
UPDATE life_exam_questions SET label = '収入は生活に十分だ' WHERE id = 2;
UPDATE life_exam_questions SET label = '将来の資金計画が立てられている' WHERE id = 3;
UPDATE life_exam_questions SET label = '借金や経済的不安が少ない' WHERE id = 4;
UPDATE life_exam_questions SET label = '投資や副業など資産形成を意識している' WHERE id = 5;

-- 人的資本 (subject_id = 2, question id 6-10)
UPDATE life_exam_questions SET label = '健康状態に自信がある' WHERE id = 6;
UPDATE life_exam_questions SET label = '仕事に必要なスキルが身についている' WHERE id = 7;
UPDATE life_exam_questions SET label = '学び直しや自己投資をしている' WHERE id = 8;
UPDATE life_exam_questions SET label = 'キャリアの見通しが描けている' WHERE id = 9;
UPDATE life_exam_questions SET label = '信頼できる人脈がいる' WHERE id = 10;

-- 社会資本 (subject_id = 3, question id 11-15)
UPDATE life_exam_questions SET label = '困ったときに頼れる人がいる' WHERE id = 11;
UPDATE life_exam_questions SET label = '地域やコミュニティに参加している' WHERE id = 12;
UPDATE life_exam_questions SET label = '社会的なつながりに満足している' WHERE id = 13;
UPDATE life_exam_questions SET label = '他者から信頼されていると感じる' WHERE id = 14;
UPDATE life_exam_questions SET label = '情報や機会を得るネットワークがある' WHERE id = 15;

-- 時間資本 (subject_id = 4, question id 16-20)
UPDATE life_exam_questions SET label = '自分のための時間が取れている' WHERE id = 16;
UPDATE life_exam_questions SET label = '仕事とプライベートのバランスが取れている' WHERE id = 17;
UPDATE life_exam_questions SET label = '睡眠・休息が十分に取れている' WHERE id = 18;
UPDATE life_exam_questions SET label = 'やりたいことに時間を使えている' WHERE id = 19;
UPDATE life_exam_questions SET label = '時間に追われず生活できている' WHERE id = 20;

-- 心理資本 (subject_id = 5, question id 21-25)
UPDATE life_exam_questions SET label = '全体的に人生に満足している' WHERE id = 21;
UPDATE life_exam_questions SET label = 'ストレスをうまく対処できている' WHERE id = 22;
UPDATE life_exam_questions SET label = '自分に価値があると感じている' WHERE id = 23;
UPDATE life_exam_questions SET label = '将来に希望を持っている' WHERE id = 24;
UPDATE life_exam_questions SET label = '日々の生活に意味を感じている' WHERE id = 25;
