// quiz.js — test yechish ekrani logikasi

let questions = [];
let currentIndex = 0;
let userAnswers = {}; // question_id -> answer_id
let testId = null;

async function initQuiz() {
  if (!requireLoginOrRedirect()) return;

  const params = new URLSearchParams(window.location.search);
  testId = params.get('test_id');
  if (!testId) { window.location.href = 'tests.html'; return; }

  try {
    const data = await apiFetch(`/tests/${testId}/questions`);
    questions = data.questions;
    document.getElementById('testTitle').textContent = data.test.title;
    renderQuestion();
  } catch (e) {
    if (e.message.includes('Pro')) {
      alert("Bu test faqat Pro obunachilar uchun. Pricing sahifasiga o'tasiz.");
      window.location.href = 'pricing.html';
    } else {
      document.getElementById('quizContainer').innerHTML = `<p class="error-msg">${e.message}</p>`;
    }
  }
}

function updateGauge() {
  const total = questions.length;
  const answered = Object.keys(userAnswers).length;
  const circle = document.getElementById('gaugeProgress');
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - answered / total);
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;
  document.getElementById('gaugeNum').textContent = `${currentIndex + 1}`;
  document.getElementById('gaugeOf').textContent = `/ ${total}`;
}

function renderQuestion() {
  const q = questions[currentIndex];
  updateGauge();

  document.getElementById('questionText').textContent = q.question_text;

  const imgEl = document.getElementById('questionImage');
  if (q.image_url) {
    imgEl.src = q.image_url;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const container = document.getElementById('answersContainer');
  container.innerHTML = '';
  q.answers.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = 'answer-option';
    if (userAnswers[q.id] === a.id) div.classList.add('selected');
    div.innerHTML = `<div class="answer-letter">${letters[i]}</div><div>${a.answer_text}</div>`;
    div.onclick = () => selectAnswer(q.id, a.id);
    container.appendChild(div);
  });

  document.getElementById('prevBtn').disabled = currentIndex === 0;
  document.getElementById('nextBtn').textContent = currentIndex === questions.length - 1 ? 'Yakunlash' : 'Keyingi';
}

function selectAnswer(questionId, answerId) {
  userAnswers[questionId] = answerId;
  renderQuestion();
}

function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

async function submitQuiz() {
  const answersPayload = Object.entries(userAnswers).map(([question_id, answer_id]) => ({ question_id, answer_id }));
  try {
    const result = await apiFetch(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: answersPayload })
    });
    showResult(result);
  } catch (e) {
    alert('Xatolik: ' + e.message + " (Internet yo'qligi mumkin, keyinroq qayta urining)");
  }
}

function showResult(result) {
  document.getElementById('quizScreen').style.display = 'none';
  const resultScreen = document.getElementById('resultScreen');
  resultScreen.style.display = 'block';
  resultScreen.innerHTML = `
    <div class="card center">
      <h2 style="color: ${result.passed ? 'var(--sign-green)' : 'var(--sign-red)'}">
        ${result.passed ? "O'TDINGIZ ✅" : "O'TA OLMADINGIZ ❌"}
      </h2>
      <p class="display" style="font-size:36px;margin:10px 0;">${result.score} / ${result.total}</p>
      <p class="muted">Imtihonda o'tish uchun kamida 90% to'g'ri javob kerak</p>
    </div>
    <button class="btn btn-primary" onclick="location.href='tests.html'">Testlar ro'yxatiga qaytish</button>
    <button class="btn btn-secondary btn-block-gap" onclick="location.reload()">Qayta yechish</button>
  `;
}

window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
