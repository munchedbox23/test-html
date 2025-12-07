// Глобальные переменные
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let totalTimer = 0;
let questionTimer = 30;
let totalTimerInterval = null;
let questionTimerInterval = null;
let testStartTime = null;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("questions.json");
    const data = await response.json();
    questions = data.questions;
    updateQuestionCount();
  } catch (error) {
    console.error("Ошибка загрузки вопросов:", error);
  }
});

// Обработка загрузки файла
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        questions = data.questions;
        updateQuestionCount();
        alert("Вопросы успешно загружены!");
      } catch (error) {
        alert("Ошибка при чтении файла. Проверьте формат JSON.");
      }
    };
    reader.readAsText(file);
  }
});

// Обновление счетчика вопросов
function updateQuestionCount() {
  document.getElementById("questionCount").textContent = questions.length;
}

// Просмотр вопросов
function viewQuestions() {
  if (questions.length === 0) {
    alert("Вопросы не загружены!");
    return;
  }

  let preview = "Загруженные вопросы:\n\n";
  questions.forEach((q, index) => {
    preview += `${index + 1}. ${q.question.substring(0, 100)}...\n`;
    preview += `   Тип: ${q.type}\n\n`;
  });

  alert(preview);
}

// Сброс вопросов
function resetQuestions() {
  if (confirm("Вы уверены, что хотите сбросить загруженные вопросы?")) {
    questions = [];
    updateQuestionCount();
    document.getElementById("fileInput").value = "";
  }
}

// Функция перемешивания массива (Fisher-Yates)
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Начало теста
function startTest() {
  if (questions.length === 0) {
    alert("Пожалуйста, загрузите вопросы перед началом теста!");
    return;
  }

  // Перемешиваем вопросы
  questions = shuffleArray(questions);

  // Перемешиваем варианты ответов для каждого вопроса
  questions.forEach((q) => {
    if (q.type === "radio" || q.type === "checkbox") {
      const originalOptions = [...q.options];
      const shuffledOptions = shuffleArray(q.options);

      // Обновляем индексы правильных ответов
      if (Array.isArray(q.correctAnswers)) {
        q.correctAnswers = q.correctAnswers.map((oldIndex) => {
          const originalValue = originalOptions[oldIndex];
          return shuffledOptions.indexOf(originalValue);
        });
      }

      q.options = shuffledOptions;
    }
  });

  // Инициализация ответов пользователя
  userAnswers = {};
  currentQuestionIndex = 0;

  // Расчет общего времени (30 секунд на вопрос)
  totalTimer = questions.length * 30;
  testStartTime = Date.now();

  // Переключение экранов
  document.getElementById("setupScreen").classList.add("hidden");
  document.getElementById("testScreen").classList.remove("hidden");
  document.getElementById("timerContainer").classList.remove("hidden");

  // Создание карты вопросов
  createQuestionMap();

  // Показ первого вопроса
  showQuestion(0);

  // Запуск таймеров
  startTimers();
}

// Создание карты вопросов
function createQuestionMap() {
  const mapContainer = document.getElementById("questionMap");
  mapContainer.innerHTML = "";

  questions.forEach((q, index) => {
    const mapItem = document.createElement("div");
    mapItem.className = "question-map-item";
    mapItem.textContent = index + 1;
    mapItem.onclick = () => showQuestion(index);
    mapContainer.appendChild(mapItem);
  });
}

// Обновление карты вопросов
function updateQuestionMap() {
  const mapItems = document.querySelectorAll(".question-map-item");
  mapItems.forEach((item, index) => {
    item.classList.remove("current", "answered");

    if (index === currentQuestionIndex) {
      item.classList.add("current");
    }

    if (userAnswers[index] !== undefined) {
      item.classList.add("answered");
    }
  });
}

// Показ вопроса
function showQuestion(index) {
  // Сохранение текущего ответа
  saveCurrentAnswer();

  currentQuestionIndex = index;
  const question = questions[index];
  const container = document.getElementById("questionContainer");

  // Сброс таймера вопроса
  questionTimer = 30;

  // Обновление прогресс-бара
  const progress = ((index + 1) / questions.length) * 100;
  document.getElementById("progressFill").style.width = progress + "%";

  // Генерация HTML вопроса
  let html = `
        <div class="question-header">
            <div class="question-number">Вопрос ${index + 1} из ${
    questions.length
  }</div>
            <div class="question-timer" id="currentQuestionTimer">Время: 00:30</div>
        </div>
        <div class="question-text">${question.question}</div>
    `;

  // Генерация вариантов ответа в зависимости от типа
  switch (question.type) {
    case "radio":
      html += generateRadioOptions(question, index);
      break;
    case "checkbox":
      html += generateCheckboxOptions(question, index);
      break;
    case "input":
      html += generateInputField(question, index);
      break;
    case "order":
      html += generateOrderQuestion(question, index);
      break;
    case "matching":
      html += generateMatchingQuestion(question, index);
      break;
  }

  container.innerHTML = html;

  // Восстановление сохраненного ответа
  restoreAnswer(index);

  // Обновление стилей выбранных опций
  updateOptionStyles();

  // Обновление кнопок навигации
  updateNavigationButtons();

  // Обновление карты вопросов
  updateQuestionMap();
}

// Генерация radio-кнопок
function generateRadioOptions(question, qIndex) {
  let html = '<div class="options">';
  question.options.forEach((option, oIndex) => {
    html += `
            <div class="option" onclick="selectRadio('q${qIndex}_o${oIndex}')">
                <input type="radio" name="q${qIndex}" id="q${qIndex}_o${oIndex}" value="${oIndex}">
                <label for="q${qIndex}_o${oIndex}">${option}</label>
            </div>
        `;
  });
  html += "</div>";
  return html;
}

// Генерация checkbox-ов
function generateCheckboxOptions(question, qIndex) {
  let html = '<div class="options">';
  question.options.forEach((option, oIndex) => {
    html += `
            <div class="option" onclick="toggleCheckbox('q${qIndex}_o${oIndex}')">
                <input type="checkbox" name="q${qIndex}" id="q${qIndex}_o${oIndex}" value="${oIndex}">
                <label for="q${qIndex}_o${oIndex}">${option}</label>
            </div>
        `;
  });
  html += "</div>";
  return html;
}

// Функция для выбора radio button при клике на область
function selectRadio(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.checked = true;
    updateOptionStyles();
  }
}

// Функция для переключения checkbox при клике на область
function toggleCheckbox(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.checked = !input.checked;
    updateOptionStyles();
  }
}

// Обновление стилей выбранных опций
function updateOptionStyles() {
  const options = document.querySelectorAll('.option');
  options.forEach(option => {
    const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
    if (input && input.checked) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Генерация поля ввода
function generateInputField(question, qIndex) {
  let html = '<div class="options">';

  if (question.options && question.options.length > 0) {
    // Если есть варианты с пропуском
    html += '<p style="margin-bottom: 15px;">Заполните пропущенное:</p>';
    question.options.forEach((option, oIndex) => {
      if (option === "___") {
        html += `<input type="text" class="input-answer" id="q${qIndex}_input" placeholder="Введите ответ">`;
      } else {
        html += `<p style="margin: 5px 0;">${option}</p>`;
      }
    });
  } else {
    html += `<input type="text" class="input-answer" id="q${qIndex}_input" placeholder="Введите ответ">`;
  }

  html += "</div>";
  return html;
}

// Генерация вопроса на упорядочивание
function generateOrderQuestion(question, qIndex) {
  const shuffledItems = shuffleArray([...question.items]);

  let html = `
        <p style="margin-bottom: 15px;">Расположите элементы в правильном порядке (перетаскивайте мышью):</p>
        <div class="drag-drop-container">
            <div class="drop-zone" id="orderZone${qIndex}" ondrop="drop(event)" ondragover="allowDrop(event)">
    `;

  shuffledItems.forEach((item, index) => {
    html += `
            <div class="drag-item" draggable="true" ondragstart="drag(event)" id="item${qIndex}_${index}" data-value="${item}">
                ${item}
            </div>
        `;
  });

  html += `
            </div>
        </div>
    `;

  return html;
}

// Генерация вопроса на сопоставление
function generateMatchingQuestion(question, qIndex) {
  const shuffledRights = shuffleArray([...question.pairs.map((p) => p.right)]);

  let html = `
        <p style="margin-bottom: 15px;">Сопоставьте элементы:</p>
        <div class="matching-container">
    `;

  question.pairs.forEach((pair, index) => {
    html += `
            <div class="matching-item">
                <strong>${pair.left}</strong>
                <select id="match${qIndex}_${index}" class="matching-select">
                    <option value="">-- Выберите --</option>
        `;

    shuffledRights.forEach((right, rIndex) => {
      html += `<option value="${right}">${right}</option>`;
    });

    html += `
                </select>
            </div>
        `;
  });

  html += "</div>";
  return html;
}

// Drag and drop функции
function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
  ev.target.classList.add("dragging");
}

function drop(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const draggedElement = document.getElementById(data);

  if (draggedElement) {
    draggedElement.classList.remove("dragging");

    // Если бросили на другой элемент, меняем их местами
    if (ev.target.classList.contains("drag-item")) {
      const parent = ev.target.parentNode;
      const draggedIndex = Array.from(parent.children).indexOf(draggedElement);
      const targetIndex = Array.from(parent.children).indexOf(ev.target);

      if (draggedIndex < targetIndex) {
        parent.insertBefore(draggedElement, ev.target.nextSibling);
      } else {
        parent.insertBefore(draggedElement, ev.target);
      }
    } else if (ev.target.classList.contains("drop-zone")) {
      ev.target.appendChild(draggedElement);
    }
  }
}

// Сохранение текущего ответа
function saveCurrentAnswer() {
  const question = questions[currentQuestionIndex];

  if (!question) return;

  switch (question.type) {
    case "radio":
      const radioChecked = document.querySelector(
        `input[name="q${currentQuestionIndex}"]:checked`
      );
      if (radioChecked) {
        userAnswers[currentQuestionIndex] = parseInt(radioChecked.value);
      }
      break;

    case "checkbox":
      const checkboxes = document.querySelectorAll(
        `input[name="q${currentQuestionIndex}"]:checked`
      );
      userAnswers[currentQuestionIndex] = Array.from(checkboxes).map((cb) =>
        parseInt(cb.value)
      );
      break;

    case "input":
      const input = document.getElementById(`q${currentQuestionIndex}_input`);
      if (input) {
        userAnswers[currentQuestionIndex] = input.value.trim();
      }
      break;

    case "order":
      const orderZone = document.getElementById(
        `orderZone${currentQuestionIndex}`
      );
      if (orderZone) {
        const items = Array.from(orderZone.children);
        userAnswers[currentQuestionIndex] = items.map(
          (item) => item.dataset.value
        );
      }
      break;

    case "matching":
      const matches = {};
      question.pairs.forEach((pair, index) => {
        const select = document.getElementById(
          `match${currentQuestionIndex}_${index}`
        );
        if (select) {
          matches[pair.left] = select.value;
        }
      });
      userAnswers[currentQuestionIndex] = matches;
      break;
  }
}

// Восстановление сохраненного ответа
function restoreAnswer(index) {
  const answer = userAnswers[index];
  const question = questions[index];

  if (answer === undefined) return;

  switch (question.type) {
    case "radio":
      const radio = document.querySelector(
        `input[name="q${index}"][value="${answer}"]`
      );
      if (radio) radio.checked = true;
      break;

    case "checkbox":
      if (Array.isArray(answer)) {
        answer.forEach((value) => {
          const checkbox = document.querySelector(
            `input[name="q${index}"][value="${value}"]`
          );
          if (checkbox) checkbox.checked = true;
        });
      }
      break;

    case "input":
      const input = document.getElementById(`q${index}_input`);
      if (input) input.value = answer;
      break;

    case "order":
      // Порядок уже сохранен в DOM
      break;

    case "matching":
      question.pairs.forEach((pair, pIndex) => {
        const select = document.getElementById(`match${index}_${pIndex}`);
        if (select && answer[pair.left]) {
          select.value = answer[pair.left];
        }
      });
      break;
  }
}

// Навигация
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    showQuestion(currentQuestionIndex - 1);
  }
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    showQuestion(currentQuestionIndex + 1);
  }
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");

  prevBtn.disabled = currentQuestionIndex === 0;

  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.style.display = "none";
    finishBtn.style.display = "inline-block";
  } else {
    nextBtn.style.display = "inline-block";
    finishBtn.style.display = "none";
  }
}

// Таймеры
function startTimers() {
  // Общий таймер
  totalTimerInterval = setInterval(() => {
    totalTimer--;

    const minutes = Math.floor(totalTimer / 60);
    const seconds = totalTimer % 60;
    document.getElementById("totalTimer").textContent = `${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (totalTimer <= 0) {
      finishTest();
    }
  }, 1000);

  // Таймер вопроса
  questionTimerInterval = setInterval(() => {
    questionTimer--;

    const minutes = Math.floor(questionTimer / 60);
    const seconds = questionTimer % 60;
    const timerElement = document.getElementById("currentQuestionTimer");
    if (timerElement) {
      timerElement.textContent = `Время: ${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
    }

    // Таймер вопроса не останавливает тест, только информирует
    if (questionTimer <= 0) {
      questionTimer = 30; // Сброс для следующего вопроса
    }
  }, 1000);
}

function stopTimers() {
  if (totalTimerInterval) {
    clearInterval(totalTimerInterval);
    totalTimerInterval = null;
  }
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }
}

// Завершение теста
function finishTest() {
  // Сохранение последнего ответа
  saveCurrentAnswer();

  // Остановка таймеров
  stopTimers();

  // Подсчет результатов
  const results = calculateResults();

  // Переключение на экран результатов
  document.getElementById("testScreen").classList.add("hidden");
  document.getElementById("resultsScreen").classList.remove("hidden");
  document.getElementById("timerContainer").classList.add("hidden");

  // Отображение результатов
  displayResults(results);
}

// Подсчет результатов
function calculateResults() {
  let correct = 0;
  let total = questions.length;
  const details = [];

  questions.forEach((question, index) => {
    const userAnswer = userAnswers[index];
    let isCorrect = false;
    let userAnswerText = "";
    let correctAnswerText = "";

    switch (question.type) {
      case "radio":
        isCorrect = userAnswer === question.correctAnswers[0];
        userAnswerText =
          userAnswer !== undefined
            ? question.options[userAnswer]
            : "Не отвечено";
        correctAnswerText = question.options[question.correctAnswers[0]];
        break;

      case "checkbox":
        const userSet = new Set(userAnswer || []);
        const correctSet = new Set(question.correctAnswers);
        isCorrect =
          userSet.size === correctSet.size &&
          [...userSet].every((val) => correctSet.has(val));
        userAnswerText =
          userAnswer && userAnswer.length > 0
            ? userAnswer.map((i) => question.options[i]).join(", ")
            : "Не отвечено";
        correctAnswerText = question.correctAnswers
          .map((i) => question.options[i])
          .join(", ");
        break;

      case "input":
        const normalizedUserAnswer = (userAnswer || "").toLowerCase().trim();
        isCorrect = question.correctAnswers.some(
          (correct) => normalizedUserAnswer === correct.toLowerCase().trim()
        );
        userAnswerText = userAnswer || "Не отвечено";
        correctAnswerText = question.correctAnswers.join(" или ");
        break;

      case "order":
        isCorrect =
          JSON.stringify(userAnswer) === JSON.stringify(question.items);
        userAnswerText = userAnswer ? userAnswer.join(" → ") : "Не отвечено";
        correctAnswerText = question.items.join(" → ");
        break;

      case "matching":
        isCorrect = question.pairs.every(
          (pair) => userAnswer && userAnswer[pair.left] === pair.right
        );
        userAnswerText = userAnswer
          ? Object.entries(userAnswer)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ")
          : "Не отвечено";
        correctAnswerText = question.pairs
          .map((p) => `${p.left}: ${p.right}`)
          .join("; ");
        break;
    }

    if (isCorrect) correct++;

    details.push({
      questionNumber: index + 1,
      question: question.question,
      isCorrect,
      userAnswer: userAnswerText,
      correctAnswer: correctAnswerText,
    });
  });

  return {
    correct,
    total,
    percentage: Math.round((correct / total) * 100),
    details,
  };
}

// Отображение результатов
function displayResults(results) {
  // Отображение общего результата
  document.getElementById("scoreDisplay").textContent =
    results.percentage + "%";
  document.getElementById("scoreDetails").innerHTML = `
        <p>Правильных ответов: ${results.correct} из ${results.total}</p>
        <p>Неправильных ответов: ${results.total - results.correct}</p>
    `;

  // Отображение детального разбора только неправильных ответов
  const detailedContainer = document.getElementById("detailedResults");
  const incorrectAnswers = results.details.filter((d) => !d.isCorrect);

  if (incorrectAnswers.length === 0) {
    detailedContainer.innerHTML =
      '<p style="text-align: center; color: #28a745; font-size: 18px;">🎉 Поздравляем! Все ответы правильные!</p>';
  } else {
    let html = "";
    incorrectAnswers.forEach((detail) => {
      html += `
                <div class="result-item ${detail.isCorrect ? "correct" : ""}">
                    <div class="result-question">Вопрос ${
                      detail.questionNumber
                    }: ${detail.question}</div>
                    <div class="result-answer your-answer">
                        <strong>Ваш ответ:</strong> ${detail.userAnswer}
                    </div>
                    <div class="result-answer correct-answer">
                        <strong>Правильный ответ:</strong> ${
                          detail.correctAnswer
                        }
                    </div>
                </div>
            `;
    });
    detailedContainer.innerHTML = html;
  }
}

// Перезапуск теста
function restartTest() {
  userAnswers = {};
  currentQuestionIndex = 0;

  document.getElementById("resultsScreen").classList.add("hidden");
  document.getElementById("setupScreen").classList.remove("hidden");
}

// Возврат к настройкам
function backToSetup() {
  stopTimers();
  userAnswers = {};
  currentQuestionIndex = 0;

  document.getElementById("testScreen").classList.add("hidden");
  document.getElementById("resultsScreen").classList.add("hidden");
  document.getElementById("setupScreen").classList.remove("hidden");
  document.getElementById("timerContainer").classList.add("hidden");
}
