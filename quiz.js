/* =========================================
   STUDENT QUIZ APPLICATION
   Student-side code only. No admin functions.
========================================= */

/* =========================================
   1. GLOBAL VARIABLES
========================================= */

let score = 0;
let questionIndex = 0;
let questions = [];
let selectedAnswers = [];
let studentName = "";
let studentToken = "";
let quizStarted = false;
let resultSubmitting = false;
let reviewEnabled = false;
let confirmAction = null;
let palettePage = 0;

const QUESTIONS_PER_PALETTE_PAGE = 12;
const TOKEN_KEY = "quizStudentToken";
const ROLL_KEY = "quizStudentRollNumber";
const QUESTIONS_CACHE_KEY = "quizQuestionsCache";
const COMPLETED_KEY = "quizCompleted_";
const RESULT_KEY = "quizResult_";


/* =========================================
   2. COMMON HELPERS
========================================= */

function getElement(id) {
    return document.getElementById(id);
}

function showMessage(id, message, isError = false) {
    const element = getElement(id);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#dc3545" : "#0877d1";
}

function getCompletedKey() {
    return COMPLETED_KEY + studentName;
}

function getResultKey() {
    return RESULT_KEY + studentName;
}

function getProgressKey() {
    return "quizStudentProgress_" + studentName;
}

function isQuizCompleted() {
    return Boolean(
        studentName && localStorage.getItem(getCompletedKey()) === "true"
    );
}

function getSavedQuizResult() {
    if (!studentName) return null;

    try {
        const savedResult = localStorage.getItem(getResultKey());
        return savedResult ? JSON.parse(savedResult) : null;
    } catch (error) {
        console.error("Saved result restore error:", error);
        return null;
    }
}

function getStudentHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + studentToken
    };
}

function setScreen(screenId) {
    const screenIds = [
        "startScreen",
        "passwordScreen",
        "noQuestions",
        "quizScreen",
        "resultScreen"
    ];

    screenIds.forEach(function (id) {
        const element = getElement(id);
        if (element) {
            element.style.display = id === screenId ? "block" : "none";
        }
    });
}


/* =========================================
   3. PAGE INITIALIZATION
========================================= */

window.addEventListener("DOMContentLoaded", function () {
    if (!getElement("startScreen")) return;

    studentToken = localStorage.getItem(TOKEN_KEY) || "";
    studentName = localStorage.getItem(ROLL_KEY) || "";

    fetchTestTitle();
    loadQuestionsFromServer();
});


/* =========================================
   4. LOAD QUIZ TITLE
========================================= */

async function fetchTestTitle() {
    try {
        const response = await fetch("/api/quiz/test-title");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load quiz title.");
        }

        const title = data.testTitle || data.quizTitle || "Online Examination";
        const titleElement = getElement("testTitle");

        if (titleElement) {
            titleElement.textContent = title;
        }

        localStorage.setItem("quizTitle", title);
        restoreQuizTitle();

    } catch (error) {
        console.error("Quiz title loading error:", error);
        restoreQuizTitle();
    }
}

function restoreQuizTitle() {
    const title = localStorage.getItem("quizTitle") ||
        "Welcome to Online Assessment";

    const displayTitle = getElement("displayQuizTitle");
    const quizHeading = getElement("quizHeading");
    const titleElement = getElement("testTitle");

    if (displayTitle) displayTitle.textContent = title;
    if (quizHeading) quizHeading.textContent = title;

    if (titleElement && !titleElement.textContent.trim()) {
        titleElement.textContent = title;
    }
}


/* =========================================
   5. LOAD QUESTIONS
========================================= */

async function loadQuestionsFromServer() {
    let cacheLoaded = false;

    // Display cached questions while the server request is running.
    try {
        const cached = localStorage.getItem(QUESTIONS_CACHE_KEY);

        if (cached) {
            const cachedQuestions = JSON.parse(cached);

            if (Array.isArray(cachedQuestions)) {
                questions = cachedQuestions;
                cacheLoaded = true;
                updateQuestionCount();
            }
        }

    } catch (error) {
        console.error("Question cache error:", error);
        localStorage.removeItem(QUESTIONS_CACHE_KEY);
    }

    try {
        const response = await fetch("/api/quiz/questions");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load questions.");
        }

        questions = Array.isArray(data.questions)
            ? data.questions
            : [];

        localStorage.setItem(
            QUESTIONS_CACHE_KEY,
            JSON.stringify(questions)
        );

        updateQuestionCount();

    } catch (error) {
        console.error("Question loading error:", error);

        if (!cacheLoaded) {
            showMessage("noQuestionsText", error.message, true);
        }
    }

    restoreQuizTitle();

    // A completed student must not see the start screen again.
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (questions.length > 0 && studentToken && studentName) {

        const savedProgress = loadQuizProgress();

        if (savedProgress) {
            quizStarted = true;
            showStudentQuiz();
            showQuestion();
        } else {
            showCorrectScreen();
        }

    } else {
        showCorrectScreen();
    }
}

function updateQuestionCount() {
    const countElement = getElement("questionCount");

    if (countElement) {
        countElement.textContent = questions.length;
    }
}


/* =========================================
   6. STUDENT SCREENS AND LOGIN
========================================= */

function showCorrectScreen() {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (questions.length === 0) {
        setScreen("noQuestions");
    } else {
        setScreen("startScreen");
    }

    restoreQuizTitle();
}

function showPasswordScreen() {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (questions.length === 0) {
        showCorrectScreen();
        return;
    }

    setScreen("passwordScreen");

    const rollInput = getElement("studentRollNumber");

    if (rollInput && studentName) {
        rollInput.value = studentName;
    }
}

async function verifyPassword() {
    const rollInput = getElement("studentRollNumber");
    const passwordInput = getElement("testPassword");

    const rollNumber = rollInput ? rollInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!rollNumber || !password) {
        showMessage(
            "passwordMessage",
            "Enter your roll number and password.",
            true
        );
        return;
    }

    showMessage("passwordMessage", "Checking login details...");

    try {
        const response = await fetch("/api/student/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rollNumber: rollNumber,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.token) {
            throw new Error(data.message || "Login failed.");
        }

        studentToken = data.token;
        studentName = data.rollNumber || rollNumber.toUpperCase();

        localStorage.setItem(TOKEN_KEY, studentToken);
        localStorage.setItem(ROLL_KEY, studentName);

        if (passwordInput) {
            passwordInput.value = "";
        }

        if (isQuizCompleted()) {
            showThankYouScreen();
            return;
        }

        const savedProgress = loadQuizProgress();

        if (!savedProgress) {
            selectedAnswers = [];
            questionIndex = 0;
            palettePage = 0;
        }

        startQuiz();

    } catch (error) {
        showMessage("passwordMessage", error.message, true);
    }
}


/* =========================================
   7. START AND RESTORE QUIZ
========================================= */
async function startQuiz() {

    // Check whether the student already completed the quiz
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    // Check student login
    if (!studentToken || !studentName) {
        showPasswordScreen();
        return;
    }

    // Check whether questions are available
    if (questions.length === 0) {
        showCorrectScreen();
        return;
    }

    try {

        // Open full-screen before starting the quiz
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }

        // Verify full-screen is active
        if (!document.fullscreenElement) {
            alert("Full-screen mode is required to start the test.");
            return;
        }

        // Reset submission status
        resultSubmitting = false;

        // Start quiz
        quizStarted = true;

        // Display student roll number
        const studentDisplay = getElement("studentDisplay");

        if (studentDisplay) {
            studentDisplay.textContent = "Roll Number: " + studentName;
        }

        // Show quiz screen
        setScreen("quizScreen");

        // Save progress
        saveQuizProgress();

        // Display current question
        showQuestion();

    } catch (error) {

        console.error("Full-screen error:", error);

        alert("Please allow full-screen mode to start the test.");

        quizStarted = false;
    }
}


function showStudentQuiz() {

    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    // Do not display quiz until full-screen is active
    if (!document.fullscreenElement) {
        quizStarted = false;
        return;
    }

    setScreen("quizScreen");

    const studentDisplay = getElement("studentDisplay");

    if (studentDisplay) {
        studentDisplay.textContent = "Roll Number: " + studentName;
    }
}

document.addEventListener("fullscreenchange", function () {

    if (!document.fullscreenElement && quizStarted) {

        // Save current answer and progress
        const selected = document.querySelector(
            'input[name="quizAnswer"]:checked'
        );

        if (selected) {
            selectedAnswers[questionIndex] = selected.value;
        }

        saveQuizProgress();

        // Pause quiz
        quizStarted = false;

        alert("Warning! Full-screen mode exited. Click Resume Test to continue.");

        setScreen("startScreen");
    }

});
/* =========================================
   8. DISPLAY QUESTION AND OPTIONS
========================================= */

function showQuestion() {
    if (questions.length === 0) return;

    if (questionIndex < 0 || questionIndex >= questions.length) {
        return;
    }

    const currentQuestion = questions[questionIndex];

    if (!currentQuestion) return;

    const questionNumber = getElement("questionNumber");
    const questionText = getElement("question");
    const optionsContainer = getElement("options");
    const feedback = getElement("feedback");

    if (questionNumber) {
        questionNumber.textContent =
            "Question " + (questionIndex + 1) +
            " of " + questions.length;
    }

    if (questionText) {
        questionText.textContent = currentQuestion.question || "";
    }

    if (feedback) {
        feedback.textContent = "";
    }

    showQuestionImage(currentQuestion.imageUrl);

    if (optionsContainer) {
        optionsContainer.innerHTML = "";

        const options = Array.isArray(currentQuestion.options)
            ? currentQuestion.options
            : [];

        options.forEach(function (option) {
            const label = document.createElement("label");
            label.className = "option";

            const radio = document.createElement("input");

            radio.type = "radio";
            radio.name = "quizAnswer";
            radio.value = option.letter;

            radio.checked =
                selectedAnswers[questionIndex] === option.letter;

            if (radio.checked) {
                label.classList.add("selected");
            }

            radio.addEventListener("change", function () {
                answerSelected(option.letter);
            });

            const optionText = document.createElement("span");

            optionText.textContent =
                (option.letter ? option.letter + ". " : "") +
                (option.text || "");

            label.appendChild(radio);
            label.appendChild(optionText);

            optionsContainer.appendChild(label);
        });
    }

    const previousBtn = getElement("previousBtn");

    if (previousBtn) {
        previousBtn.disabled = questionIndex === 0;
    }

    const saveNextBtn = getElement("saveNextBtn");

    if (saveNextBtn) {
        saveNextBtn.textContent =
            questionIndex === questions.length - 1
                ? "Submit Quiz"
                : "Save & Next";

        saveNextBtn.disabled = false;
    }

    const clearBtn = getElement("clearBtn");

    if (clearBtn) {
        clearBtn.disabled = !selectedAnswers[questionIndex];
    }

    palettePage = Math.floor(
        questionIndex / QUESTIONS_PER_PALETTE_PAGE
    );

    renderPalette();
}


/* =========================================
   9. SHOW QUESTION IMAGE
========================================= */

function showQuestionImage(imageUrl) {
    const container = getElement("questionImageContainer");
    const image = getElement("questionImage");

    if (!container || !image) return;

    if (imageUrl && typeof imageUrl === "string") {
        image.onerror = function () {
            container.style.display = "none";
            image.removeAttribute("src");
        };

        image.src = imageUrl;
        container.style.display = "block";

    } else {
        image.removeAttribute("src");
        container.style.display = "none";
    }
}


/* =========================================
   10. QUESTION PALETTE PAGINATION
========================================= */

function renderPalette() {
    const palette = getElement("paletteButtons");

    if (!palette) return;

    palette.innerHTML = "";

    const totalQuestions = questions.length;

    const totalPages = Math.ceil(
        totalQuestions / QUESTIONS_PER_PALETTE_PAGE
    );

    const pageInfo = getElement("palettePageInfo");
    const pageNumber = getElement("palettePageNumber");
    const previousPageBtn = getElement("previousPaletteBtn");
    const nextPageBtn = getElement("nextPaletteBtn");

    if (totalPages === 0) {
        if (pageInfo) pageInfo.textContent = "0 / 0";
        if (pageNumber) pageNumber.textContent = "0 / 0";

        if (previousPageBtn) previousPageBtn.disabled = true;
        if (nextPageBtn) nextPageBtn.disabled = true;

        return;
    }

    if (palettePage >= totalPages) {
        palettePage = totalPages - 1;
    }

    if (palettePage < 0) {
        palettePage = 0;
    }

    const startIndex = palettePage * QUESTIONS_PER_PALETTE_PAGE;

    const endIndex = Math.min(
        startIndex + QUESTIONS_PER_PALETTE_PAGE,
        totalQuestions
    );

    for (let i = startIndex; i < endIndex; i++) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = i + 1;
        button.className = "palette-button";

        if (i === questionIndex) {
            button.classList.add("current");

        } else if (
            selectedAnswers[i] !== undefined &&
            selectedAnswers[i] !== null &&
            selectedAnswers[i] !== ""
        ) {
            button.classList.add("answered");

        } else {
            button.classList.add("unanswered");
        }

        button.addEventListener("click", function () {
            goToQuestion(i);
        });

        palette.appendChild(button);
    }

    if (pageInfo) {
        pageInfo.textContent =
            (startIndex + 1) + "–" + endIndex +
            " / " + totalQuestions;
    }

    if (pageNumber) {
        pageNumber.textContent =
            (palettePage + 1) + " / " + totalPages;
    }

    if (previousPageBtn) {
        previousPageBtn.disabled = palettePage === 0;
    }

    if (nextPageBtn) {
        nextPageBtn.disabled = palettePage === totalPages - 1;
    }
}

function previousPalettePage() {
    if (palettePage > 0) {
        palettePage--;
        renderPalette();
    }
}

function nextPalettePage() {
    const totalPages = Math.ceil(
        questions.length / QUESTIONS_PER_PALETTE_PAGE
    );

    if (palettePage < totalPages - 1) {
        palettePage++;
        renderPalette();
    }
}

function goToQuestion(index) {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (index < 0 || index >= questions.length) return;

    questionIndex = index;

    palettePage = Math.floor(
        index / QUESTIONS_PER_PALETTE_PAGE
    );

    showQuestion();
    saveQuizProgress();
}


/* =========================================
   11. ANSWER SELECTION AND NAVIGATION
========================================= */

function answerSelected(answer) {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    selectedAnswers[questionIndex] = answer;

    const saveNextBtn = getElement("saveNextBtn");
    const clearBtn = getElement("clearBtn");

    if (saveNextBtn) saveNextBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;

    document.querySelectorAll(".option").forEach(function (option) {
        option.classList.remove("selected");

        const radio = option.querySelector("input");

        if (radio && radio.checked) {
            option.classList.add("selected");
        }
    });

    saveQuizProgress();
    renderPalette();
}

function clearAnswer() {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    selectedAnswers[questionIndex] = null;

    document.querySelectorAll(
        'input[name="quizAnswer"]'
    ).forEach(function (radio) {
        radio.checked = false;
    });

    document.querySelectorAll(".option").forEach(function (option) {
        option.classList.remove("selected");
    });

    const saveNextBtn = getElement("saveNextBtn");
    const clearBtn = getElement("clearBtn");

    if (saveNextBtn) saveNextBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;

    saveQuizProgress();
    renderPalette();
}

function saveAndNext() {
    if (resultSubmitting) return;

    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    const selected = document.querySelector(
        'input[name="quizAnswer"]:checked'
    );

    if (selected) {
        selectedAnswers[questionIndex] = selected.value;
    }

    saveQuizProgress();

    if (questionIndex < questions.length - 1) {
        questionIndex++;

        showQuestion();
        saveQuizProgress();

        return;
    }

    const answeredCount = selectedAnswers.filter(function (answer) {
        return answer !== undefined &&
            answer !== null &&
            answer !== "";
    }).length;

    const unansweredCount = questions.length - answeredCount;

    showConfirmation(
        "You answered " + answeredCount +
        " out of " + questions.length +
        " questions.\n\n" +
        unansweredCount +
        " questions are unanswered.\n\n" +
        "Do you want to submit your quiz?",
        function () {
            completeTest();
        }
    );
}

function previousQuestion() {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (questionIndex <= 0) return;

    const selected = document.querySelector(
        'input[name="quizAnswer"]:checked'
    );

    if (selected) {
        selectedAnswers[questionIndex] = selected.value;
    }

    questionIndex--;

    saveQuizProgress();
    showQuestion();
}


/* =========================================
   12. SAVE AND RESTORE STUDENT PROGRESS
========================================= */

function saveQuizProgress() {
    if (!studentName || !studentToken || isQuizCompleted()) return;

    const progress = {
        rollNumber: studentName,
        questionIndex: questionIndex,
        selectedAnswers: selectedAnswers,
        questionCount: questions.length
    };

    localStorage.setItem(
        getProgressKey(),
        JSON.stringify(progress)
    );
}

function loadQuizProgress() {
    try {
        const saved = localStorage.getItem(getProgressKey());

        if (!saved) return null;

        const progress = JSON.parse(saved);

        if (
            progress.rollNumber !== studentName ||
            progress.questionCount !== questions.length ||
            !Array.isArray(progress.selectedAnswers)
        ) {
            localStorage.removeItem(getProgressKey());
            return null;
        }

        selectedAnswers = progress.selectedAnswers;
        questionIndex = Number(progress.questionIndex) || 0;

        if (
            questionIndex < 0 ||
            questionIndex >= questions.length
        ) {
            questionIndex = 0;
        }

        return progress;

    } catch (error) {
        console.error("Progress restore error:", error);

        localStorage.removeItem(getProgressKey());

        return null;
    }
}


/* =========================================
   13. SUBMIT QUIZ
========================================= */

async function completeTest() {
    if (resultSubmitting) return;

    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    if (!studentToken || !studentName) {
        showPasswordScreen();
        return;
    }

    if (questions.length === 0) {
        showMessage("feedback", "No questions available.", true);
        return;
    }

    resultSubmitting = true;

    const saveNextBtn = getElement("saveNextBtn");

    if (saveNextBtn) {
        saveNextBtn.disabled = true;
        saveNextBtn.textContent = "Submitting...";
    }

    try {
        const answers = questions.map(function (question, index) {
            return {
                questionId: question._id,
                answer: selectedAnswers[index] || ""
            };
        });

        const response = await fetch("/api/quiz/results", {
            method: "POST",
            headers: getStudentHeaders(),
            body: JSON.stringify({
                answers: answers
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            if (response.status === 401) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(ROLL_KEY);
                localStorage.removeItem(getProgressKey());

                studentToken = "";
                studentName = "";
            }

            throw new Error(
                data.message || "Could not submit quiz."
            );
        }

        // Store completion only after the server confirms the submission.
        localStorage.setItem(getCompletedKey(), "true");

        localStorage.setItem(
            getResultKey(),
            JSON.stringify(data)
        );

        localStorage.removeItem(getProgressKey());

        score = Number(data.score) || 0;
        resultSubmitting = false;

        await showResultScreen(data);

    } catch (error) {
        console.error("Quiz submission error:", error);

        resultSubmitting = false;

        if (saveNextBtn) {
            saveNextBtn.disabled = false;

            saveNextBtn.textContent =
                questionIndex === questions.length - 1
                    ? "Submit Quiz"
                    : "Save & Next";
        }

        showMessage("feedback", error.message, true);
    }
}


/* =========================================
   14. THANK-YOU SCREEN FOR COMPLETED QUIZ
========================================= */

function showThankYouScreen() {
    quizStarted = false;
    resultSubmitting = false;

    setScreen("resultScreen");

    const reviewContainer = getElement("answerReview");
    const thankYou = getElement("thankYouMessage");

    const savedResult = getSavedQuizResult();

    if (savedResult) {
        const resultMessage = getElement("resultMessage");
        const finalScore = getElement("finalScore");
        const finalPercentage = getElement("finalPercentage");

        if (resultMessage) {
            resultMessage.textContent =
                "Roll Number: " + studentName;
        }

        if (finalScore) {
            finalScore.textContent =
                (savedResult.score ?? 0) +
                " / " +
                (savedResult.total ?? questions.length);
        }

        if (finalPercentage) {
            finalPercentage.textContent =
                (savedResult.percentage ?? 0) + "%";
        }
    }

    if (reviewContainer) {
        reviewContainer.style.display = "none";
    }

    if (thankYou) {
        thankYou.style.display = "block";

        thankYou.textContent =
            "Your answers have been submitted successfully.";
    }

    if (
        savedResult &&
        savedResult.resultId &&
        studentToken
    ) {
        checkStudentReviewPermission(savedResult.resultId);
    }
}


/* =========================================
   15. DISPLAY RESULT
========================================= */

async function showResultScreen(data) {
    quizStarted = false;

    if (studentName) {
        localStorage.setItem(getCompletedKey(), "true");

        localStorage.setItem(
            getResultKey(),
            JSON.stringify(data)
        );

        localStorage.removeItem(getProgressKey());
    }

    setScreen("resultScreen");

    const resultMessage = getElement("resultMessage");
    const finalScore = getElement("finalScore");
    const finalPercentage = getElement("finalPercentage");

    if (resultMessage) {
        resultMessage.textContent =
            "Result for Roll Number: " + studentName;
    }

    if (finalScore) {
        finalScore.textContent =
            (data.score ?? 0) +
            " / " +
            (data.total ?? questions.length);
    }

    if (finalPercentage) {
        finalPercentage.textContent =
            (data.percentage ?? 0) + "%";
    }

    await checkStudentReviewPermission(data.resultId);
}


/* =========================================
   16. STUDENT ANSWER REVIEW
========================================= */

async function checkStudentReviewPermission(resultId) {
    const reviewContainer = getElement("answerReview");
    const thankYou = getElement("thankYouMessage");

    if (reviewContainer) {
        reviewContainer.style.display = "none";
    }

    if (thankYou) {
        thankYou.style.display = "block";
    }

    try {
        const response = await fetch("/api/quiz/review-setting");
        const data = await response.json();

        reviewEnabled =
            response.ok &&
            data.success &&
            data.reviewEnabled === true;

        if (reviewEnabled && resultId) {
            await showFinalReview(resultId);
        }

    } catch (error) {
        console.error("Review setting error:", error);
    }
}

async function showFinalReview(resultId) {
    try {
        const response = await fetch(
            "/api/quiz/results/" +
            encodeURIComponent(resultId) +
            "/review",
            {
                headers: getStudentHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Answer review is unavailable."
            );
        }

        const reviewContainer = getElement("answerReview");
        const reviewContent = getElement("answerReviewContent");
        const thankYou = getElement("thankYouMessage");

        if (!reviewContainer || !reviewContent) return;

        reviewContent.innerHTML = "";

        const feedbackItems = Array.isArray(data.feedback)
            ? data.feedback
            : [];

        feedbackItems.forEach(function (item, index) {
            const card = document.createElement("div");
            card.className = "review-question";

            const questionTitle = document.createElement("h4");

            questionTitle.textContent =
                "Question " + (index + 1) +
                ": " + (item.question || "");

            card.appendChild(questionTitle);

            if (item.imageUrl) {
                const image = document.createElement("img");

                image.src = item.imageUrl;
                image.alt = "Question image";

                image.onerror = function () {
                    image.style.display = "none";
                };

                card.appendChild(image);
            }

            const selected = document.createElement("p");

            selected.textContent =
                "Your Answer: " +
                (item.selectedAnswer || "Not answered");

            const correct = document.createElement("p");

            correct.textContent =
                "Correct Answer: " +
                (item.correctAnswer || "Not available");

            const status = document.createElement("p");

            status.textContent =
                item.isCorrect ? "Correct" : "Incorrect";

            status.className =
                item.isCorrect ? "review-correct" : "review-wrong";

            card.appendChild(selected);
            card.appendChild(correct);
            card.appendChild(status);

            reviewContent.appendChild(card);
        });

        reviewContainer.style.display = "block";

        if (thankYou) {
            thankYou.style.display = "none";
        }

    } catch (error) {
        console.error("Answer review error:", error);

        const thankYou = getElement("thankYouMessage");

        if (thankYou) {
            thankYou.style.display = "block";

            thankYou.textContent =
                "Your quiz was submitted successfully. Answer review is currently unavailable.";
        }
    }
}


/* =========================================
   17. CANCEL AND CONFIRMATION
========================================= */

function cancelTest() {
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    showConfirmation(
        "Are you sure you want to cancel this test? Your saved progress will be deleted.",
        function () {
            if (studentName) {
                localStorage.removeItem(getProgressKey());
            }

            selectedAnswers = [];
            questionIndex = 0;
            palettePage = 0;
            quizStarted = false;
            resultSubmitting = false;

            studentToken = "";
            studentName = "";

            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ROLL_KEY);

            showCorrectScreen();
        }
    );
}

function restartQuiz() {
    // A completed quiz cannot be restarted by the student.
    if (studentName && isQuizCompleted()) {
        showThankYouScreen();
        return;
    }

    score = 0;
    questionIndex = 0;
    selectedAnswers = [];
    palettePage = 0;
    quizStarted = false;
    resultSubmitting = false;

    if (studentName) {
        localStorage.removeItem(getProgressKey());
    }

    showCorrectScreen();
}

function showConfirmation(message, action) {
    const box = getElement("confirmBox");
    const customMessage = getElement("customMessage");

    confirmAction = action;

    if (customMessage) {
        customMessage.textContent = message;
    }

    if (box) {
        box.style.display = "flex";
    }
}

function confirmYes() {
    const box = getElement("confirmBox");

    if (box) {
        box.style.display = "none";
    }

    const action = confirmAction;
    confirmAction = null;

    if (typeof action === "function") {
        action();
    }
}

function confirmNo() {
    const box = getElement("confirmBox");

    if (box) {
        box.style.display = "none";
    }

    confirmAction = null;
}


/* =========================================
   18. BASIC TEST SECURITY AND AUTO-SAVE
========================================= */

document.addEventListener("keydown", function (event) {
    if (quizStarted && event.key === "Escape") {
        event.preventDefault();
    }
});

document.addEventListener("contextmenu", function (event) {
    if (quizStarted) {
        event.preventDefault();
    }
});

window.addEventListener("beforeunload", function () {
    if (!quizStarted || !studentToken || !studentName) return;

    const selected = document.querySelector(
        'input[name="quizAnswer"]:checked'
    );

    if (selected) {
        selectedAnswers[questionIndex] = selected.value;
    }

    saveQuizProgress();
});