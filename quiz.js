
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

function getProgressKey() {
    return "quizStudentProgress_" + studentName;
}


/* =========================================
   2. PAGE LOADING
========================================= */

window.addEventListener("DOMContentLoaded", function () {

    if (getElement("adminLoginGate")) {
        restoreAdminSession();
    }

    if (getElement("startScreen")) {

        studentToken = localStorage.getItem(TOKEN_KEY) || "";
        studentName = localStorage.getItem(ROLL_KEY) || "";

        loadQuestionsFromServer();

    }

});


/* =========================================
   3. COMMON HELPER FUNCTIONS
========================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function (char) {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[char];

    });

}


function getElement(id) {
    return document.getElementById(id);
}


function showMessage(id, message, isError = false) {

    const element = getElement(id);

    if (!element) return;

    element.textContent = message;

    element.style.color = isError ? "#dc3545" : "#0877d1";

}


function getAdminPassword() {
    return sessionStorage.getItem("adminPassword") || "";
}


function getStudentHeaders() {

    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + studentToken
    };

}


function getAdminHeaders() {

    return {
        "Content-Type": "application/json",
        "x-admin-password": getAdminPassword()
    };

}


/* =========================================
   4. LOAD QUESTIONS - CACHE FIRST
========================================= */

async function loadQuestionsFromServer() {

    let cacheLoaded = false;

    // Load questions immediately from localStorage.
    try {

        const cached = localStorage.getItem(QUESTIONS_CACHE_KEY);

        if (cached) {

            const cachedQuestions = JSON.parse(cached);

            if (Array.isArray(cachedQuestions)) {

                questions = cachedQuestions;
                cacheLoaded = true;

                restoreQuizTitle();

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

        }

    } catch (error) {

        console.error("Local cache error:", error);

        localStorage.removeItem(QUESTIONS_CACHE_KEY);

    }

    // Fetch latest questions in the background.
    try {

        const response = await fetch("/api/quiz/questions");

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Unable to load questions.");

        }

        const latestQuestions = Array.isArray(data.questions)
            ? data.questions
            : [];

        localStorage.setItem(
            QUESTIONS_CACHE_KEY,
            JSON.stringify(latestQuestions)
        );

        // Display server questions if no cache exists.
        if (!cacheLoaded) {

            questions = latestQuestions;

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

        updateQuestionCount();

    } catch (error) {

        console.error("Question loading error:", error);

        if (!cacheLoaded) {

            const message = getElement("noQuestionsText");

            if (message) {
                message.textContent = error.message;
            }

            showCorrectScreen();

        }

    }

}


/* =========================================
   5. SHOW CORRECT STUDENT SCREEN
========================================= */

function showCorrectScreen() {

    const startScreen = getElement("startScreen");
    const passwordScreen = getElement("passwordScreen");
    const noQuestions = getElement("noQuestions");
    const quizScreen = getElement("quizScreen");
    const resultScreen = getElement("resultScreen");

    if (startScreen) startScreen.style.display = "none";
    if (passwordScreen) passwordScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "none";
    if (resultScreen) resultScreen.style.display = "none";

    if (questions.length === 0) {

        if (noQuestions) {
            noQuestions.style.display = "flex";
        }

    } else {

        if (noQuestions) {
            noQuestions.style.display = "none";
        }

        if (startScreen) {
            startScreen.style.display = "block";
        }

    }

    restoreQuizTitle();

}


function restoreQuizTitle() {

    const title = localStorage.getItem("quizTitle") ||
        "Welcome to Online Assessment";

    const displayTitle = getElement("displayQuizTitle");
    const quizHeading = getElement("quizHeading");
    const adminTitle = getElement("quizTitle");

    if (displayTitle) displayTitle.textContent = title;
    if (quizHeading) quizHeading.textContent = title;
    if (adminTitle) adminTitle.value = title;

}


/* =========================================
   6. STUDENT LOGIN SCREEN
========================================= */

function showPasswordScreen() {

    if (questions.length === 0) {

        showCorrectScreen();

        return;

    }

    const startScreen = getElement("startScreen");
    const passwordScreen = getElement("passwordScreen");

    if (startScreen) startScreen.style.display = "none";
    if (passwordScreen) passwordScreen.style.display = "block";

    const rollInput = getElement("studentRollNumber");

    if (rollInput && studentName) {
        rollInput.value = studentName;
    }

}


/* =========================================
   7. STUDENT LOGIN API
========================================= */

async function verifyPassword() {

    const rollNumber = getElement("studentRollNumber")?.value.trim();
    const password = getElement("testPassword")?.value;

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

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Login failed.");

        }

        studentToken = data.token;
        studentName = data.rollNumber;

        localStorage.setItem(TOKEN_KEY, studentToken);
        localStorage.setItem(ROLL_KEY, studentName);

        getElement("testPassword").value = "";

        // Restore this student's saved progress if available.
        const savedProgress = loadQuizProgress();

        if (!savedProgress) {

            selectedAnswers = [];
            questionIndex = 0;

        }

        startQuiz();

    } catch (error) {

        showMessage(
            "passwordMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   8. START QUIZ
========================================= */

function startQuiz() {

    if (!studentToken || !studentName) {

        showPasswordScreen();

        return;

    }

    if (questions.length === 0) {

        showCorrectScreen();

        return;

    }

    score = 0;
    resultSubmitting = false;
    quizStarted = true;

    const studentDisplay = getElement("studentDisplay");

    if (studentDisplay) {
        studentDisplay.textContent = "Roll Number: " + studentName;
    }

    const passwordScreen = getElement("passwordScreen");
    const startScreen = getElement("startScreen");
    const quizScreen = getElement("quizScreen");
    const resultScreen = getElement("resultScreen");

    if (passwordScreen) passwordScreen.style.display = "none";
    if (startScreen) startScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "block";
    if (resultScreen) resultScreen.style.display = "none";

    saveQuizProgress();

    showQuestion();

}


/* =========================================
   9. RESTORE QUIZ AFTER RELOAD
========================================= */

function showStudentQuiz() {

    const startScreen = getElement("startScreen");
    const passwordScreen = getElement("passwordScreen");
    const quizScreen = getElement("quizScreen");
    const resultScreen = getElement("resultScreen");
    const noQuestions = getElement("noQuestions");

    if (startScreen) startScreen.style.display = "none";
    if (passwordScreen) passwordScreen.style.display = "none";
    if (resultScreen) resultScreen.style.display = "none";
    if (noQuestions) noQuestions.style.display = "none";

    if (quizScreen) quizScreen.style.display = "block";

    const studentDisplay = getElement("studentDisplay");

    if (studentDisplay) {
        studentDisplay.textContent = "Roll Number: " + studentName;
    }

}


/* =========================================
   10. SHOW QUESTION
========================================= */

function showQuestion() {

    if (questions.length === 0) return;

    if (questionIndex < 0 || questionIndex >= questions.length) {
        return;
    }

    const currentQuestion = questions[questionIndex];

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
        questionText.textContent = currentQuestion.question;
    }

    if (feedback) {
        feedback.textContent = "";
    }

    showQuestionImage(currentQuestion.imageUrl);

    if (optionsContainer) {

        optionsContainer.innerHTML = "";

        currentQuestion.options.forEach(function (option) {

            const label = document.createElement("label");

            label.className = "option";

            const radio = document.createElement("input");

            radio.type = "radio";
            radio.name = "quizAnswer";
            radio.value = option.letter;

            const selectedAnswer = selectedAnswers[questionIndex];

            if (selectedAnswer === option.letter) {

                radio.checked = true;

                label.classList.add("selected");

            }

            radio.addEventListener("change", function () {

                answerSelected(option.letter);

            });

            const text = document.createElement("span");

            text.textContent = option.letter + ". " + option.text;

            label.appendChild(radio);
            label.appendChild(text);

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

  
   renderPalette();


}


/* =====================================
   QUESTION PALETTE PAGINATION
===================================== */

function renderPalette() {

    const palette = document.getElementById("paletteButtons");

    if (!palette) return;

    palette.innerHTML = "";

    const totalQuestions = questions.length;

    const totalPages = Math.ceil(
        totalQuestions / QUESTIONS_PER_PALETTE_PAGE
    );

    if (totalPages === 0) {
        document.getElementById("palettePageInfo").textContent = "0 / 0";
        document.getElementById("palettePageNumber").textContent = "0 / 0";
        return;
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

        button.onclick = function () {
            goToQuestion(i);
        };

        palette.appendChild(button);
    }

    document.getElementById("palettePageInfo").textContent =
        `${startIndex + 1}–${endIndex} / ${totalQuestions}`;

    document.getElementById("palettePageNumber").textContent =
        `${palettePage + 1} / ${totalPages}`;

    document.getElementById("previousPaletteBtn").disabled =
        palettePage === 0;

    document.getElementById("nextPaletteBtn").disabled =
        palettePage === totalPages - 1;
}


/* =====================================
   PALETTE PREVIOUS PAGE
===================================== */

function previousPalettePage() {

    if (palettePage > 0) {

        palettePage--;

        renderPalette();

    }
}


/* =====================================
   PALETTE NEXT PAGE
===================================== */

function nextPalettePage() {

    const totalPages = Math.ceil(
        questions.length / QUESTIONS_PER_PALETTE_PAGE
    );

    if (palettePage < totalPages - 1) {

        palettePage++;

        renderPalette();

    }
}


/* =====================================
   OPEN QUESTION FROM PALETTE
===================================== */

function goToQuestion(index) {

    if (index < 0 || index >= questions.length) return;

    questionIndex = index;

    palettePage = Math.floor(
        index / QUESTIONS_PER_PALETTE_PAGE
    );

    showQuestion();

    renderPalette();
}

/* =========================================
   11. SHOW QUESTION IMAGE
========================================= */

function showQuestionImage(imageUrl) {

    const container = getElement("questionImageContainer");
    const image = getElement("questionImage");

    if (!container || !image) return;

    if (imageUrl && typeof imageUrl === "string") {

        image.src = imageUrl;

        image.onerror = function () {

            container.style.display = "none";

            image.removeAttribute("src");

        };

        container.style.display = "block";

    } else {

        image.removeAttribute("src");

        container.style.display = "none";

    }

}


/* =========================================
   12. SELECT ANSWER
========================================= */

function answerSelected(answer) {

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


/* =========================================
   13. CLEAR ANSWER
========================================= */

function clearAnswer() {

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


/* =========================================
   14. SAVE ANSWER AND NEXT
========================================= */
function saveAndNext() {

    if (resultSubmitting) return;

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

    } else {

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

}


/* =========================================
   15. PREVIOUS QUESTION
========================================= */

function previousQuestion() {

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
   16. QUESTION PALETTE
========================================= */



/* =========================================
   17. SAVE PROGRESS - LOCALSTORAGE ONLY
========================================= */

function saveQuizProgress() {

    if (!studentName || !studentToken) return;

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


/* =========================================
   18. RESTORE PROGRESS - LOCALSTORAGE ONLY
========================================= */

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

        if (questionIndex < 0 || questionIndex >= questions.length) {
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
   19. COMPLETE QUIZ
========================================= */

async function completeTest() {

    if (resultSubmitting) return;

    // Prevent empty quiz submission
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

        // Prepare all answers.
        // Unanswered questions will be sent as empty strings.
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

            throw new Error(data.message || "Could not submit quiz.");

        }

        // Remove saved progress after successful submission.
        localStorage.removeItem(getProgressKey());

        score = data.score;

        showResultScreen(data);

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

        showMessage(
            "feedback",
            error.message,
            true
        );

    }

}


/* =========================================
   20. SHOW RESULT SCREEN
========================================= */

async function showResultScreen(data) {

    quizStarted = false;

    const quizScreen = getElement("quizScreen");
    const resultScreen = getElement("resultScreen");

    if (quizScreen) quizScreen.style.display = "none";
    if (resultScreen) resultScreen.style.display = "block";

    const resultMessage = getElement("resultMessage");
    const finalScore = getElement("finalScore");
    const finalPercentage = getElement("finalPercentage");

    if (resultMessage) {

        resultMessage.textContent =
            "Result for Roll Number: " + studentName;

    }

    if (finalScore) {

        finalScore.textContent =
            data.score + " / " + data.total;

    }

    if (finalPercentage) {

        finalPercentage.textContent =
            data.percentage + "%";

    }

    await checkStudentReviewPermission(data.resultId);

}


/* =========================================
   21. CHECK STUDENT REVIEW PERMISSION
========================================= */

async function checkStudentReviewPermission(resultId) {

    const reviewContainer = getElement("answerReview");
    const thankYou = getElement("thankYouMessage");

    if (reviewContainer) reviewContainer.style.display = "none";
    if (thankYou) thankYou.style.display = "block";

    try {

        const response = await fetch("/api/quiz/review-setting");

        const data = await response.json();

        reviewEnabled = data.success && data.reviewEnabled === true;

        if (reviewEnabled && resultId) {

            await showFinalReview(resultId);

        }

    } catch (error) {

        console.error("Review setting error:", error);

    }

}


/* =========================================
   22. SHOW ANSWER REVIEW
========================================= */

async function showFinalReview(resultId) {

    try {

        const response = await fetch(
            "/api/quiz/results/" + encodeURIComponent(resultId) + "/review",
            {
                headers: getStudentHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Answer review is unavailable.");

        }

        const reviewContainer = getElement("answerReview");
        const reviewContent = getElement("answerReviewContent");
        const thankYou = getElement("thankYouMessage");

        if (!reviewContainer || !reviewContent) return;

        reviewContent.innerHTML = "";

        data.feedback.forEach(function (item, index) {

            const card = document.createElement("div");

            card.className = "review-question";

            const questionTitle = document.createElement("h4");

            questionTitle.textContent =
                "Question " + (index + 1) + ": " + item.question;

            card.appendChild(questionTitle);

            if (item.imageUrl) {

                const image = document.createElement("img");

                image.src = item.imageUrl;
                image.alt = "Question image";

                card.appendChild(image);

            }

            const selected = document.createElement("p");

            selected.textContent =
                "Your Answer: " + item.selectedAnswer;

            const correct = document.createElement("p");

            correct.textContent =
                "Correct Answer: " + item.correctAnswer;

            const status = document.createElement("p");

            status.textContent = item.isCorrect
                ? "Correct"
                : "Incorrect";

            status.className = item.isCorrect
                ? "review-correct"
                : "review-wrong";

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
   23. RESTART QUIZ
========================================= */

function restartQuiz() {

    score = 0;
    questionIndex = 0;

    selectedAnswers = [];

    quizStarted = false;
    resultSubmitting = false;

    if (studentName) {
        localStorage.removeItem(getProgressKey());
    }

    const resultScreen = getElement("resultScreen");
    const passwordScreen = getElement("passwordScreen");
    const startScreen = getElement("startScreen");

    if (resultScreen) resultScreen.style.display = "none";
    if (passwordScreen) passwordScreen.style.display = "none";
    if (startScreen) startScreen.style.display = "block";

    showCorrectScreen();

}


/* =========================================
   24. CANCEL QUIZ
========================================= */

function cancelTest() {

    showConfirmation(
        "Are you sure you want to cancel this test? Your saved progress will be deleted.",
        function () {

            if (studentName) {
                localStorage.removeItem(getProgressKey());
            }

            selectedAnswers = [];
            questionIndex = 0;

            quizStarted = false;

            studentToken = "";
            studentName = "";

            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ROLL_KEY);

            showCorrectScreen();

        }
    );

}


/* =========================================
   25. ADMIN LOGIN
========================================= */

async function adminLogin() {

    const password = getElement("adminPassword")?.value;

    if (!password) {

        showMessage(
            "adminMessage",
            "Enter admin password.",
            true
        );

        return;

    }

    try {

        const response = await fetch("/api/admin/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                password: password
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Admin login failed.");

        }

        sessionStorage.setItem("adminPassword", password);

        showAdminPanel();

    } catch (error) {

        showMessage(
            "adminMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   26. RESTORE ADMIN SESSION
========================================= */

async function restoreAdminSession() {

    const password = getAdminPassword();

    if (!password) return;

    try {

        const response = await fetch("/api/admin/review-setting", {
            headers: getAdminHeaders()
        });

        if (!response.ok) {

            sessionStorage.removeItem("adminPassword");

            return;

        }

        showAdminPanel();

    } catch (error) {

        console.error("Admin session error:", error);

    }

}


/* =========================================
   27. SHOW ADMIN PANEL
========================================= */

function showAdminPanel() {

    const loginGate = getElement("adminLoginGate");
    const adminPanel = getElement("adminPanel");

    if (loginGate) loginGate.style.display = "none";
    if (adminPanel) adminPanel.style.display = "block";

    fetchReviewSetting();
    fetchStudents();
    fetchStudentResults();
    updateQuestionCount();

}


/* =========================================
   28. ADMIN LOGOUT
========================================= */

function adminLogout() {

    sessionStorage.removeItem("adminPassword");

    const adminPanel = getElement("adminPanel");
    const loginGate = getElement("adminLoginGate");

    if (adminPanel) adminPanel.style.display = "none";
    if (loginGate) loginGate.style.display = "block";

    if (getElement("adminPassword")) {
        getElement("adminPassword").value = "";
    }

}


/* =========================================
   29. SAVE QUIZ TITLE
========================================= */

function saveQuizTitle() {

    const title = getElement("quizTitle")?.value.trim();

    if (!title) {

        showMessage(
            "titleMessage",
            "Enter a quiz title.",
            true
        );

        return;

    }

    localStorage.setItem("quizTitle", title);

    showMessage(
        "titleMessage",
        "Quiz title saved successfully."
    );

}


/* =========================================
   30. PARSE QUESTION TEXT
========================================= */

function parseQuestionText(text) {

    const blocks = text
        .replace(/\r/g, "")
        .split(/\n\s*\n/)
        .filter(function (block) {
            return block.trim() !== "";
        });

    const validQuestions = [];
    const invalidBlocks = [];

    blocks.forEach(function (block, index) {

        const lines = block
            .split("\n")
            .map(function (line) {
                return line.trim();
            })
            .filter(Boolean);

        let question = "";
        let options = [];
        let answer = "";
        let imageUrl = "";

        lines.forEach(function (line) {

            const optionMatch = line.match(
                /^([A-Z])[.)\-:]\s*(.+)$/i
            );

            const answerMatch = line.match(
                /^(?:ANSWER|ANS)\s*[:\-]\s*([A-Z])$/i
            );

            const imageMatch = line.match(
                /^IMAGE\s*[:\-]\s*(.+)$/i
            );

            if (optionMatch) {

                options.push({
                    letter: optionMatch[1].toUpperCase(),
                    text: optionMatch[2].trim()
                });

            } else if (answerMatch) {

                answer = answerMatch[1].toUpperCase();

            } else if (imageMatch) {

                imageUrl = imageMatch[1].trim();

            } else {

                question += (question ? " " : "") + line;

            }

        });

        question = question.replace(/^\d+[.)]\s*/, "");

        const optionLetters = new Set(
            options.map(function (option) {
                return option.letter;
            })
        );

        if (
            question &&
            options.length >= 2 &&
            answer &&
            optionLetters.has(answer)
        ) {

            validQuestions.push({
                question: question,
                options: options,
                answer: answer,
                imageUrl: imageUrl
            });

        } else {

            invalidBlocks.push(index + 1);

        }

    });

    return {
        questions: validQuestions,
        invalidBlocks: invalidBlocks
    };

}


/* =========================================
   31. UPLOAD QUESTIONS TO SERVER
========================================= */

async function uploadQuestionsToServer(questionList) {

    const response = await fetch("/api/admin/questions", {

        method: "POST",

        headers: getAdminHeaders(),

        body: JSON.stringify({
            questions: questionList
        })

    });

    const data = await response.json();

    if (!response.ok || !data.success) {

        throw new Error(data.message || "Question upload failed.");

    }

    return data;

}


/* =========================================
   32. IMPORT QUESTIONS FROM TXT
========================================= */

async function importQuestions() {

    const fileInput = getElement("questionFile");

    if (!fileInput || !fileInput.files.length) {

        showMessage(
            "importMessage",
            "Please select a TXT file.",
            true
        );

        return;

    }

    const file = fileInput.files[0];

    try {

        const text = await file.text();

        const parsed = parseQuestionText(text);

        if (parsed.questions.length === 0) {

            throw new Error(
                "No valid questions found. Check your TXT format."
            );

        }

        const data = await uploadQuestionsToServer(parsed.questions);

        // Remove old local question cache.
        localStorage.removeItem(QUESTIONS_CACHE_KEY);

        localStorage.setItem("importedFileName", file.name);

        let message = data.message;

        if (parsed.invalidBlocks.length > 0) {

            message += " Invalid question blocks: " +
                parsed.invalidBlocks.join(", ");

        }

        showMessage("importMessage", message);

        updateQuestionCount();

    } catch (error) {

        showMessage(
            "importMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   33. IMPORT MANUALLY TYPED QUESTIONS
========================================= */

async function importTypedQuestions() {

    const text = getElement("typedQuestions")?.value.trim();

    if (!text) {

        showMessage(
            "typedImportMessage",
            "Enter your questions first.",
            true
        );

        return;

    }

    try {

        const parsed = parseQuestionText(text);

        if (parsed.questions.length === 0) {

            throw new Error(
                "No valid questions found. Check the question format."
            );

        }

        const data = await uploadQuestionsToServer(parsed.questions);

        localStorage.removeItem(QUESTIONS_CACHE_KEY);

        let message = data.message;

        if (parsed.invalidBlocks.length > 0) {

            message += " Invalid blocks: " +
                parsed.invalidBlocks.join(", ");

        }

        showMessage("typedImportMessage", message);

        getElement("typedQuestions").value = "";

        updateQuestionCount();

    } catch (error) {

        showMessage(
            "typedImportMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   34. UPDATE QUESTION COUNT
========================================= */

async function updateQuestionCount() {

    const element = getElement("questionCount");

    if (!element) return;

    try {

        const response = await fetch("/api/quiz/questions");

        const data = await response.json();

        if (response.ok && data.success) {

            element.textContent = data.questions.length;

        }

    } catch (error) {

        element.textContent = "Unable to load";

    }

}


/* =========================================
   35. DELETE ALL QUESTIONS
========================================= */

function deleteAllQuestions() {

    showConfirmation(
        "Are you sure you want to delete all quiz questions?",
        async function () {

            try {

                const response = await fetch("/api/admin/questions", {

                    method: "DELETE",

                    headers: getAdminHeaders()

                });

                const data = await response.json();

                if (!response.ok || !data.success) {

                    throw new Error(data.message || "Delete failed.");

                }

                localStorage.removeItem(QUESTIONS_CACHE_KEY);

                showMessage(
                    "uploadMessage",
                    data.message
                );

                updateQuestionCount();

            } catch (error) {

                showMessage(
                    "uploadMessage",
                    error.message,
                    true
                );

            }

        }
    );

}


/* =========================================
   36. ADD ONE STUDENT MANUALLY
========================================= */

async function addStudent() {

    const rollNumber = getElement("newStudentRollNumber")?.value.trim();
    const password = getElement("newStudentPassword")?.value;

    if (!rollNumber || !password) {

        showMessage(
            "studentAddMessage",
            "Enter roll number and password.",
            true
        );

        return;

    }

    try {

        const response = await fetch("/api/admin/students", {

            method: "POST",

            headers: getAdminHeaders(),

            body: JSON.stringify({
                rollNumber: rollNumber,
                password: password
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Unable to add student.");

        }

        getElement("newStudentRollNumber").value = "";
        getElement("newStudentPassword").value = "";

        showMessage(
            "studentAddMessage",
            data.message
        );

        fetchStudents();

    } catch (error) {

        showMessage(
            "studentAddMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   37. DOWNLOAD STUDENT CSV TEMPLATE
========================================= */

function downloadStudentCSVTemplate() {

    const csv =
        "Roll Number,Password\n" +
        "23CB001,student123\n" +
        "23CB002,student456\n";

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "student-template.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


/* =========================================
   38. READ CSV FILE
========================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            value += '"';
            i++;

        } else if (char === '"') {

            insideQuotes = !insideQuotes;

        } else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        } else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(value.trim());

            if (row.some(function (cell) {
                return cell !== "";
            })) {
                rows.push(row);
            }

            row = [];
            value = "";

        } else {

            value += char;

        }

    }

    row.push(value.trim());

    if (row.some(function (cell) {
        return cell !== "";
    })) {
        rows.push(row);
    }

    return rows;

}


/* =========================================
   39. IMPORT STUDENTS FROM CSV
========================================= */

async function importStudentsCSV() {

    const fileInput = getElement("studentCSVFile");

    if (!fileInput || !fileInput.files.length) {

        showMessage(
            "studentImportMessage",
            "Select a CSV file first.",
            true
        );

        return;

    }

    try {

        const text = await fileInput.files[0].text();

        const rows = parseCSV(text);

        if (rows.length < 2) {

            throw new Error("CSV file contains no student records.");

        }

        const headers = rows[0].map(function (header) {
            return header.trim().toLowerCase();
        });

        const rollIndex = headers.findIndex(function (header) {

            return header === "roll number" ||
                header === "rollnumber" ||
                header === "roll_number";

        });

        const passwordIndex = headers.findIndex(function (header) {
            return header === "password";
        });

        if (rollIndex === -1 || passwordIndex === -1) {

            throw new Error(
                "CSV must contain Roll Number and Password columns."
            );

        }

        const students = [];

        for (let i = 1; i < rows.length; i++) {

            const rollNumber = rows[i][rollIndex] || "";
            const password = rows[i][passwordIndex] || "";

            if (!rollNumber || !password) continue;

            students.push({
                rollNumber: rollNumber,
                password: password
            });

        }

        if (students.length === 0) {

            throw new Error("No valid student records found.");

        }

        const response = await fetch("/api/admin/import-students", {

            method: "POST",

            headers: getAdminHeaders(),

            body: JSON.stringify({
                students: students
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Student import failed.");

        }

        showMessage(
            "studentImportMessage",
            data.message
        );

        fileInput.value = "";

        fetchStudents();

    } catch (error) {

        showMessage(
            "studentImportMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   40. FETCH STUDENT LIST
========================================= */

async function fetchStudents() {

    const list = getElement("studentList");

    if (!list || !getAdminPassword()) return;

    try {

        const response = await fetch("/api/admin/students", {

            headers: getAdminHeaders()

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Unable to load students.");

        }

        const students = data.students || [];

        list.innerHTML = "";

        const count = getElement("studentCount");

        if (count) {
            count.textContent = "Total Students: " + students.length;
        }

        if (students.length === 0) {

            list.innerHTML = `
                <tr>
                    <td colspan="4">No students registered.</td>
                </tr>
            `;

            return;

        }

        students.forEach(function (student, index) {

            const tr = document.createElement("tr");

            const number = document.createElement("td");
            number.textContent = index + 1;

            const roll = document.createElement("td");
            roll.textContent = student.rollNumber;

            const status = document.createElement("td");
            status.textContent = student.isActive ? "Active" : "Inactive";

            const action = document.createElement("td");

            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete";
            deleteButton.className = "danger-button";

            deleteButton.addEventListener("click", function () {

                deleteStudent(student._id, student.rollNumber);

            });

            action.appendChild(deleteButton);

            tr.appendChild(number);
            tr.appendChild(roll);
            tr.appendChild(status);
            tr.appendChild(action);

            list.appendChild(tr);

        });

    } catch (error) {

        showMessage(
            "studentListMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   41. DELETE ONE STUDENT
========================================= */

function deleteStudent(id, rollNumber) {

    showConfirmation(
        "Delete student " + rollNumber + "?",
        async function () {

            try {

                const response = await fetch(
                    "/api/admin/students/" + encodeURIComponent(id),
                    {
                        method: "DELETE",
                        headers: getAdminHeaders()
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {

                    throw new Error(data.message || "Student deletion failed.");

                }

                showMessage(
                    "studentListMessage",
                    data.message
                );

                fetchStudents();

            } catch (error) {

                showMessage(
                    "studentListMessage",
                    error.message,
                    true
                );

            }

        }
    );

}


/* =========================================
   42. FETCH REVIEW SETTING
========================================= */

async function fetchReviewSetting() {

    try {

        const response = await fetch("/api/admin/review-setting", {

            headers: getAdminHeaders()

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Unable to load setting.");

        }

        reviewEnabled = data.reviewEnabled;

        updateReviewStatus();

    } catch (error) {

        showMessage(
            "reviewSettingMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   43. UPDATE REVIEW STATUS
========================================= */

function updateReviewStatus() {

    const status = getElement("reviewStatus");
    const button = getElement("reviewToggleBtn");

    if (status) {

        status.textContent = reviewEnabled
            ? "Enabled"
            : "Disabled";

        status.style.color = reviewEnabled
            ? "#198754"
            : "#dc3545";

    }

    if (button) {

        button.textContent = reviewEnabled
            ? "Disable Student Review"
            : "Enable Student Review";

    }

}


/* =========================================
   44. TOGGLE STUDENT REVIEW
========================================= */

async function toggleStudentReview() {

    const newValue = !reviewEnabled;

    try {

        const response = await fetch("/api/admin/review-setting", {

            method: "POST",

            headers: getAdminHeaders(),

            body: JSON.stringify({
                reviewEnabled: newValue
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(data.message || "Unable to update setting.");

        }

        reviewEnabled = data.reviewEnabled;

        updateReviewStatus();

        showMessage(
            "reviewSettingMessage",
            data.message
        );

    } catch (error) {

        showMessage(
            "reviewSettingMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   45. FETCH STUDENT RESULTS
========================================= */

async function fetchStudentResults() {

    const container = getElement("studentResults");

    if (!container || !getAdminPassword()) return;

    try {

        const response = await fetch("/api/admin/results", {

            headers: getAdminHeaders()

        });

        const results = await response.json();

        if (!response.ok || !Array.isArray(results)) {

            throw new Error(results.message || "Unable to load results.");

        }

        container.innerHTML = "";

        if (results.length === 0) {

            container.textContent = "No student results available.";

            return;

        }

        const table = document.createElement("table");

        table.className = "admin-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Roll Number</th>
                    <th>Score</th>
                    <th>Total</th>
                    <th>Percentage</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        results.forEach(function (result, index) {

            const tr = document.createElement("tr");

            const values = [
                index + 1,
                result.rollNumber || result.studentName,
                result.score,
                result.total,
                result.percentage + "%",
                result.createdAt
                    ? new Date(result.createdAt).toLocaleString()
                    : "-"
            ];

            values.forEach(function (value) {

                const td = document.createElement("td");

                td.textContent = value;

                tr.appendChild(td);

            });

            tbody.appendChild(tr);

        });

        container.appendChild(table);

    } catch (error) {

        container.textContent = error.message;

        showMessage(
            "resultsMessage",
            error.message,
            true
        );

    }

}


/* =========================================
   46. DELETE ALL RESULTS
========================================= */

function deleteAllResults() {

    showConfirmation(
        "Are you sure you want to delete all student results?",
        async function () {

            try {

                const response = await fetch("/api/admin/results", {

                    method: "DELETE",

                    headers: getAdminHeaders()

                });

                const data = await response.json();

                if (!response.ok) {

                    throw new Error(data.message || "Delete results failed.");

                }

                showMessage(
                    "resultsMessage",
                    data.message
                );

                fetchStudentResults();

            } catch (error) {

                showMessage(
                    "resultsMessage",
                    error.message,
                    true
                );

            }

        }
    );

}


/* =========================================
   47. CONFIRMATION POPUP
========================================= */

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
   48. KEYBOARD CONTROLS
========================================= */

document.addEventListener("keydown", function (event) {

    if (!quizStarted) return;

    if (event.key === "Escape") {
        event.preventDefault();
    }

});


/* =========================================
   49. PREVENT RIGHT CLICK DURING QUIZ
========================================= */

document.addEventListener("contextmenu", function (event) {

    if (quizStarted) {
        event.preventDefault();
    }

});


/* =========================================
   50. SAVE PROGRESS BEFORE PAGE RELOAD
========================================= */

window.addEventListener("beforeunload", function () {

    if (quizStarted && studentToken) {

        const selected = document.querySelector(
            'input[name="quizAnswer"]:checked'
        );

        if (selected) {
            selectedAnswers[questionIndex] = selected.value;
        }

        saveQuizProgress();

    }

});
