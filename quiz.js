
/* ==========================================
   1. GLOBAL VARIABLES
========================================== */

let score = 0;
let questionIndex = 0;
let userAnswers = [];
let selectedAnswers = [];
let quizStarted = false;
let studentName = "";
let questions = [];
let resultSubmitting = false;
let reviewEnabled = false;
let confirmAction = null;

const TEST_PASSWORD = "1234";


/* ==========================================
   2. PAGE LOADING
========================================== */

window.addEventListener("DOMContentLoaded", async function () {

    // Restore quiz title
    let savedTitle = localStorage.getItem("quizTitle");
    let displayTitle = document.getElementById("displayQuizTitle");
    let titleInput = document.getElementById("quizTitle");

    if (savedTitle && displayTitle) {
        displayTitle.innerText = savedTitle;
    }

    if (savedTitle && titleInput) {
        titleInput.value = savedTitle;
    }

    // Restore imported file name
    let fileName = localStorage.getItem("importedFileName");
    let fileNameElement = document.getElementById("fileName");

    if (fileNameElement) {
        fileNameElement.innerText = fileName
            ? "Imported File: " + fileName
            : "No file imported yet";
    }

    // Load questions from MongoDB
    await loadQuestionsFromServer();

    // Restore admin login in the same browser tab
    let savedAdminPassword = sessionStorage.getItem("adminPassword");

    if (savedAdminPassword && document.getElementById("adminPanel")) {

        try {
            let response = await fetch("/api/admin/review-setting", {
                headers: {
                    "x-admin-password": savedAdminPassword
                },
                cache: "no-store"
            });

            if (response.ok) {

                let adminPanel = document.getElementById("adminPanel");
                let loginGate = document.getElementById("adminLoginGate");
                let loginBox = document.getElementById("adminLogin");

                if (adminPanel) adminPanel.style.display = "block";
                if (loginGate) loginGate.style.display = "none";
                if (loginBox) loginBox.style.display = "none";

                await loadAdminReviewSetting();

            } else {
                sessionStorage.removeItem("adminPassword");
            }

        } catch (error) {
            console.error("Admin session error:", error);
        }
    }

    // Restore student quiz progress
    if (questions.length > 0 && loadQuizProgress()) {

        let startScreen = document.getElementById("startScreen");
        let passwordScreen = document.getElementById("passwordScreen");
        let noQuestions = document.getElementById("noQuestions");
        let resultScreen = document.getElementById("resultScreen");
        let quizScreen = document.getElementById("quizScreen");

        if (startScreen) startScreen.style.display = "none";
        if (passwordScreen) passwordScreen.style.display = "none";
        if (noQuestions) noQuestions.style.display = "none";
        if (resultScreen) resultScreen.style.display = "none";
        if (quizScreen) quizScreen.style.display = "block";

        quizStarted = true;

        let cancelBtn = document.getElementById("cancelBtn");

        if (cancelBtn) {
            cancelBtn.style.display = "inline-block";
        }

        showQuestion();
    }
});


/* ==========================================
   3. MESSAGE BOX
========================================== */

function showMessage(message) {

    let text = document.getElementById("messageText");
    let box = document.getElementById("customMessage");

    if (text && box) {
        text.innerText = message;
        box.style.display = "block";
    } else {
        alert(message);
    }
}


function closeMessage() {

    let box = document.getElementById("customMessage");

    if (box) {
        box.style.display = "none";
    }
}


/* ==========================================
   4. LOAD QUESTIONS FROM SERVER
========================================== */

async function loadQuestionsFromServer() {

    let message = document.getElementById("importMessage");

    try {

        if (message) {
            message.innerText = "Loading questions...";
        }

        let response = await fetch("/api/quiz/questions", {
            cache: "no-store"
        });

        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load questions.");
        }

        questions = Array.isArray(data)
            ? data
            : (data.questions || []);

        checkQuestions();

        if (message) {
            message.innerText = questions.length
                ? questions.length + " questions loaded from server."
                : "No questions available on the server.";
        }

    } catch (error) {

        questions = [];

        showCorrectScreen();

        if (message) {
            message.innerText =
                "Cannot load questions. Check the server connection.";
        }

        console.error("Question loading error:", error);
    }
}


/* ==========================================
   5. SHOW CORRECT SCREEN
========================================== */

function showCorrectScreen() {

    let noQuestions = document.getElementById("noQuestions");
    let startScreen = document.getElementById("startScreen");
    let passwordScreen = document.getElementById("passwordScreen");
    let quizScreen = document.getElementById("quizScreen");

    if (questions.length === 0) {

        if (noQuestions) noQuestions.style.display = "flex";
        if (startScreen) startScreen.style.display = "none";
        if (passwordScreen) passwordScreen.style.display = "none";
        if (quizScreen) quizScreen.style.display = "none";

    } else {

        if (noQuestions) noQuestions.style.display = "none";
        if (startScreen) startScreen.style.display = "block";
        if (passwordScreen) passwordScreen.style.display = "none";
        if (quizScreen) quizScreen.style.display = "none";
    }
}


function checkQuestions() {

    let noQuestionsText = document.getElementById("noQuestionsText");

    if (questions.length === 0) {

        if (noQuestionsText) {
            noQuestionsText.innerText =
                "please Contact your administrator.";
        }

    }

    showCorrectScreen();
}


/* ==========================================
   6. HTML TEXT SAFETY
========================================== */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function (character) {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];

    });
}


function getOptionLetter(option, index) {

    if (typeof option === "object" && option !== null) {
        return String(option.letter || "").trim().toUpperCase();
    }

    return String.fromCharCode(65 + index);
}


function getOptionText(option) {

    if (typeof option === "object" && option !== null) {
        return String(option.text || "");
    }

    return String(option ?? "");
}


/* ==========================================
   7. STUDENT PASSWORD
========================================== */

function showPasswordScreen() {

    if (questions.length === 0) {
        showCorrectScreen();
        return;
    }

    let startScreen = document.getElementById("startScreen");
    let passwordScreen = document.getElementById("passwordScreen");
    let passwordInput = document.getElementById("testPassword");
    let passwordMessage = document.getElementById("passwordMessage");

    if (startScreen) startScreen.style.display = "none";
    if (passwordScreen) passwordScreen.style.display = "block";

    if (passwordInput) passwordInput.value = "";
    if (passwordMessage) passwordMessage.innerText = "";
}


function verifyPassword() {

    let passwordInput = document.getElementById("testPassword");
    let passwordMessage = document.getElementById("passwordMessage");

    let enteredPassword = passwordInput
        ? passwordInput.value
        : "";

    if (enteredPassword === TEST_PASSWORD) {

        let passwordScreen = document.getElementById("passwordScreen");

        if (passwordScreen) {
            passwordScreen.style.display = "none";
        }

        startQuiz();

    } else {

        if (passwordMessage) {
            passwordMessage.innerText =
                "Incorrect password. Please try again.";
        }
    }
}


/* ==========================================
   8. START QUIZ
========================================== */

function startQuiz() {

    if (questions.length === 0) {
        showCorrectScreen();
        return;
    }

    let nameInput = document.getElementById("studentName");

    studentName = nameInput
        ? nameInput.value.trim()
        : "";

    if (!studentName) {

        showMessage("Please enter the student name.");

        let passwordScreen = document.getElementById("passwordScreen");
        let startScreen = document.getElementById("startScreen");

        if (passwordScreen) passwordScreen.style.display = "none";
        if (startScreen) startScreen.style.display = "block";

        return;
    }

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    selectedAnswers = [];
    quizStarted = true;

    saveQuizProgress();

    if (!document.fullscreenElement &&
        document.documentElement.requestFullscreen) {

        document.documentElement.requestFullscreen()
            .catch(function () {});
    }

    let cancelBtn = document.getElementById("cancelBtn");
    let noQuestions = document.getElementById("noQuestions");
    let startScreen = document.getElementById("startScreen");
    let quizScreen = document.getElementById("quizScreen");
    let resultScreen = document.getElementById("resultScreen");

    if (cancelBtn) cancelBtn.style.display = "inline-block";
    if (noQuestions) noQuestions.style.display = "none";
    if (startScreen) startScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "block";
    if (resultScreen) resultScreen.style.display = "none";

    showQuestion();
}


/* ==========================================
   9. DISPLAY QUESTION
========================================== */

function showQuestion() {

    let q = questions[questionIndex];

    if (!q) return;

    let questionNumber = document.getElementById("questionNumber");
    let questionElement = document.getElementById("question");
    let optionsElement = document.getElementById("options");

    if (!questionNumber || !questionElement || !optionsElement) {
        return;
    }

    questionNumber.innerText =
        "Question " + (questionIndex + 1) + " of " + questions.length;

    questionElement.innerText = q.question || "";

    let optionsHTML = "";

    (q.options || []).forEach(function (option, index) {

        let letter = getOptionLetter(option, index);
        let optionText = getOptionText(option);

        optionsHTML += `
            <label class="quiz-option">
                <input
                    type="radio"
                    name="answer"
                    value="${escapeHTML(letter)}"
                    onchange="answerSelected()"
                >
                ${escapeHTML(letter)}. ${escapeHTML(optionText)}
            </label>
        `;
    });

    optionsElement.innerHTML = optionsHTML;

    let submitted =
        userAnswers[questionIndex] != null &&
        userAnswers[questionIndex] !== "";

    let selected = selectedAnswers[questionIndex];

    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {

        radio.checked = submitted
            ? radio.value === userAnswers[questionIndex]
            : radio.value === selected;

        radio.disabled = submitted;
    });

    let clearBtn = document.getElementById("clearBtn");
    let submitBtn = document.getElementById("submitBtn");
    let nextBtn = document.getElementById("nextBtn");
    let feedback = document.getElementById("feedback");
    let previousBtn = document.getElementById("previousBtn");

    if (clearBtn) {
        clearBtn.disabled = !selected || submitted;
    }

    if (submitBtn) {
        submitBtn.disabled = !selected || submitted;
    }

    if (feedback) {
        feedback.innerText = "";
    }

    if (nextBtn) {

        if (submitted) {

            nextBtn.style.display = "inline-block";

            nextBtn.innerText =
                questionIndex === questions.length - 1
                    ? "Submit Test"
                    : "Next";

        } else {

            nextBtn.style.display = "none";
        }
    }

    if (previousBtn) {

        previousBtn.style.display =
            questionIndex === 0 ? "none" : "inline-block";

        previousBtn.disabled = questionIndex === 0;
    }
}


/* ==========================================
   10. ANSWER SELECTION
========================================== */

function answerSelected() {

    let selected = document.querySelector(
        'input[name="answer"]:checked'
    );

    if (!selected) return;

    delete userAnswers[questionIndex];

    selectedAnswers[questionIndex] =
        selected.value.trim().toUpperCase();

    let nextBtn = document.getElementById("nextBtn");
    let clearBtn = document.getElementById("clearBtn");
    let submitBtn = document.getElementById("submitBtn");
    let feedback = document.getElementById("feedback");

    if (nextBtn) nextBtn.style.display = "none";
    if (clearBtn) clearBtn.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
    if (feedback) feedback.innerText = "";

    saveQuizProgress();
}


/* ==========================================
   11. CLEAR ANSWER
========================================== */

function clearAnswer() {

    delete userAnswers[questionIndex];
    delete selectedAnswers[questionIndex];

    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {
        radio.checked = false;
        radio.disabled = false;
    });

    let clearBtn = document.getElementById("clearBtn");
    let submitBtn = document.getElementById("submitBtn");
    let nextBtn = document.getElementById("nextBtn");
    let feedback = document.getElementById("feedback");

    if (clearBtn) clearBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (nextBtn) nextBtn.style.display = "none";
    if (feedback) feedback.innerText = "";

    saveQuizProgress();
}


/* ==========================================
   12. SUBMIT ANSWER
========================================== */

function checkAnswer() {

    let selected = document.querySelector(
        'input[name="answer"]:checked'
    );

    let feedback = document.getElementById("feedback");

    if (!selected) {

        if (feedback) {
            feedback.innerText = "Please select an answer!";
        }

        return;
    }

    let answer = selected.value.trim().toUpperCase();

    userAnswers[questionIndex] = answer;
    selectedAnswers[questionIndex] = answer;

    if (feedback) {
        feedback.innerText = "Answer submitted successfully!";
    }

    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {
        radio.disabled = true;
    });

    let clearBtn = document.getElementById("clearBtn");
    let submitBtn = document.getElementById("submitBtn");
    let nextBtn = document.getElementById("nextBtn");

    if (clearBtn) clearBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (nextBtn) {

        nextBtn.style.display = "inline-block";

        nextBtn.innerText =
            questionIndex === questions.length - 1
                ? "Submit Test"
                : "Next";
    }

    saveQuizProgress();
}


/* ==========================================
   13. NEXT QUESTION
========================================== */

function nextQuestion() {

    if (
        userAnswers[questionIndex] == null ||
        userAnswers[questionIndex] === ""
    ) {
        return;
    }

    if (questionIndex < questions.length - 1) {

        questionIndex++;

        saveQuizProgress();

        showQuestion();

    } else {

        completeTest();
    }
}


/* ==========================================
   14. PREVIOUS QUESTION
========================================== */

function previousQuestion() {

    if (questionIndex > 0) {

        questionIndex--;

        saveQuizProgress();

        showQuestion();
    }
}


/* ==========================================
   15. SAVE QUIZ RESULT
========================================== */

async function completeTest() {

    if (resultSubmitting) return;

    resultSubmitting = true;

    quizStarted = false;

    localStorage.removeItem("quizProgress");

    let quizScreen = document.getElementById("quizScreen");
    let resultScreen = document.getElementById("resultScreen");

    if (!resultScreen) {

        console.error('Missing HTML element: resultScreen');

        resultSubmitting = false;

        return;
    }

    if (quizScreen) {
        quizScreen.style.display = "none";
    }

    resultScreen.style.display = "block";

    let total = questions.length;

    score = 0;

    questions.forEach(function (q, index) {

        let selected = String(userAnswers[index] || "")
            .trim().toUpperCase();

        let correct = String(q.answer || "")
            .trim().toUpperCase();

        if (selected && selected === correct) {
            score++;
        }
    });

    let percentageValue = total > 0
        ? (score / total) * 100
        : 0;

    let finalScore = document.getElementById("finalScore");
    let finalPercentage = document.getElementById("finalPercentage");
    let resultMessage = document.getElementById("resultMessage");

    if (finalScore) {
        finalScore.innerText = score + " / " + total;
    }

    if (finalPercentage) {
        finalPercentage.innerText =
            percentageValue.toFixed(2) + "%";
    }

    if (resultMessage) {
        resultMessage.innerText = "Test Completed!";
    }

    let cancelBtn = document.getElementById("cancelBtn");

    if (cancelBtn) {
        cancelBtn.style.display = "none";
    }

    let reviewElement = document.getElementById("answerReview");
    let thankYou = document.getElementById("thankYouMessage");

    if (reviewElement) {
        reviewElement.innerHTML = "";
        reviewElement.style.display = "none";
    }

    if (thankYou) {
        thankYou.style.display = "none";
    }

    // Check admin review permission
    let canShowReview = await checkStudentReviewPermission();

    if (canShowReview) {

        showFinalReview();

    } else if (thankYou) {

        thankYou.style.display = "block";
    }

    window.scrollTo(0, 0);

    // Prepare detailed feedback for MongoDB
    let feedbackData = questions.map(function (q, index) {

        let selectedLetter = String(userAnswers[index] || "")
            .trim().toUpperCase();

        let correctLetter = String(q.answer || "")
            .trim().toUpperCase();

        let selectedOption = (q.options || []).find(
            function (option, optionIndex) {
                return getOptionLetter(option, optionIndex) === selectedLetter;
            }
        );

        let correctOption = (q.options || []).find(
            function (option, optionIndex) {
                return getOptionLetter(option, optionIndex) === correctLetter;
            }
        );

        return {
            question: q.question,
            options: q.options,
            selectedAnswer: selectedLetter,
            selectedText: selectedOption
                ? getOptionText(selectedOption)
                : "Not answered",
            correctAnswer: correctLetter,
            correctText: correctOption
                ? getOptionText(correctOption)
                : "Correct answer not found",
            isCorrect: selectedLetter !== "" &&
                selectedLetter === correctLetter
        };
    });

    // Save result to MongoDB
    try {

        let response = await fetch("/api/quiz/results", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                studentName: studentName,
                score: score,
                total: total,
                percentage: Number(percentageValue.toFixed(2)),
                feedback: feedbackData

            })
        });

        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save result.");
        }

        console.log("Result saved successfully:", data);

    } catch (error) {

        console.error("Result saving error:", error);

        if (resultMessage) {
            resultMessage.innerText =
                "Test completed, but result could not be saved. Contact administrator.";
        }

    } finally {

        resultSubmitting = false;
    }
}


/* ==========================================
   16. STUDENT ANSWER REVIEW
========================================== */

function showFinalReview() {

    let reviewHTML = "";

    questions.forEach(function (q, index) {

        let selectedLetter = String(userAnswers[index] || "")
            .trim().toUpperCase();

        let correctLetter = String(q.answer || "")
            .trim().toUpperCase();

        let selectedOption = (q.options || []).find(
            function (option, optionIndex) {
                return getOptionLetter(option, optionIndex) === selectedLetter;
            }
        );

        let correctOption = (q.options || []).find(
            function (option, optionIndex) {
                return getOptionLetter(option, optionIndex) === correctLetter;
            }
        );

        let selectedText = selectedOption
            ? getOptionText(selectedOption)
            : "Not answered";

        let correctText = correctOption
            ? getOptionText(correctOption)
            : "Correct option not found";

        let isCorrect =
            selectedLetter !== "" &&
            selectedLetter === correctLetter;

        reviewHTML += `

            <div class="review-card">

                <h3>Question ${index + 1}</h3>

                <p>${escapeHTML(q.question)}</p>

                <p>
                    <strong>Your Answer:</strong>
                    ${escapeHTML(selectedLetter
                        ? selectedLetter + ". " + selectedText
                        : "Not answered")}
                </p>

                <p>
                    <strong>Correct Answer:</strong>
                    ${escapeHTML(correctLetter + ". " + correctText)}
                </p>

                <h4 class="${isCorrect ? "correct" : "wrong"}">
                    ${isCorrect ? "Correct ✓" : "Wrong ✗"}
                </h4>

            </div>

        `;
    });

    let reviewElement = document.getElementById("answerReview");

    if (reviewElement) {

        reviewElement.innerHTML = reviewHTML;

        reviewElement.style.display = "block";
    }
}


/* ==========================================
   17. RESTART QUIZ
========================================== */

function restartQuiz() {

    resultSubmitting = false;

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    selectedAnswers = [];
    quizStarted = false;
    studentName = "";

    localStorage.removeItem("quizProgress");

    let reviewElement = document.getElementById("answerReview");
    let thankYou = document.getElementById("thankYouMessage");

    if (reviewElement) {
        reviewElement.innerHTML = "";
        reviewElement.style.display = "none";
    }

    if (thankYou) {
        thankYou.style.display = "none";
    }

    let resultScreen = document.getElementById("resultScreen");
    let quizScreen = document.getElementById("quizScreen");
    let nameInput = document.getElementById("studentName");
    let cancelBtn = document.getElementById("cancelBtn");

    if (resultScreen) resultScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "none";
    if (nameInput) nameInput.value = "";
    if (cancelBtn) cancelBtn.style.display = "none";

    showCorrectScreen();

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(function () {});
    }
}


/* ==========================================
   18. SAVE QUIZ PROGRESS
========================================== */

function saveQuizProgress() {

    if (!quizStarted) return;

    let progress = {

        quizStarted: true,
        questionIndex: questionIndex,
        userAnswers: userAnswers,
        selectedAnswers: selectedAnswers,
        studentName: studentName,
        questionCount: questions.length

    };

    localStorage.setItem(
        "quizProgress",
        JSON.stringify(progress)
    );
}


/* ==========================================
   19. RESTORE QUIZ PROGRESS
========================================== */

function loadQuizProgress() {

    let saved = localStorage.getItem("quizProgress");

    if (!saved) return false;

    try {

        let progress = JSON.parse(saved);

        if (!progress || progress.quizStarted !== true) {
            return false;
        }

        if (progress.questionCount !== questions.length) {

            localStorage.removeItem("quizProgress");

            return false;
        }

        questionIndex = Number.isInteger(progress.questionIndex)
            ? Math.max(0, Math.min(progress.questionIndex, questions.length - 1))
            : 0;

        userAnswers = Array.isArray(progress.userAnswers)
            ? progress.userAnswers
            : [];

        selectedAnswers = Array.isArray(progress.selectedAnswers)
            ? progress.selectedAnswers
            : [];

        studentName = String(progress.studentName || "").trim();

        if (!studentName) {

            localStorage.removeItem("quizProgress");

            return false;
        }

        userAnswers.length = questions.length;
        selectedAnswers.length = questions.length;

        quizStarted = true;

        return true;

    } catch (error) {

        localStorage.removeItem("quizProgress");

        return false;
    }
}


/* ==========================================
   20. UPLOAD QUESTIONS TO SERVER
========================================== */

async function uploadQuestionsToServer(questionsToUpload) {

    let message = document.getElementById("uploadMessage");

    let password = sessionStorage.getItem("adminPassword") || "";

    if (!message) {
        alert('Add an element with id="uploadMessage" to import.html.');
        return false;
    }

    if (!password) {
        message.innerText = "Please log in as admin first.";
        return false;
    }

    if (!Array.isArray(questionsToUpload) ||
        questionsToUpload.length === 0) {

        message.innerText = "Import valid questions first.";

        return false;
    }

    try {

        message.innerText = "Uploading questions to server...";

        let response = await fetch("/api/admin/questions", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-admin-password": password
            },

            body: JSON.stringify({
                questions: questionsToUpload
            })

        });

        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Question upload failed.");
        }

        message.innerText =
            data.message || "Questions uploaded successfully.";

        return true;

    } catch (error) {

        message.innerText = error.message;

        console.error("Question upload error:", error);

        return false;
    }
}


/* ==========================================
   21. IMPORT QUESTIONS FROM TEXT FILE
========================================== */

function importQuestions() {

    let fileInput = document.getElementById("questionFile");
    let message = document.getElementById("importMessage");

    let file = fileInput && fileInput.files[0];

    if (!message) return;

    if (!file) {

        message.innerText = "Please select a text file.";

        return;
    }

    let reader = new FileReader();

    reader.onload = async function (event) {

        let text = String(event.target.result || "").trim();

        let blocks = text.split(/\r?\n\s*\r?\n/);

        let importedQuestions = [];

        for (let block of blocks) {

            let lines = block.split(/\r?\n/);

            let question = lines[0].trim();

            let options = [];

            let answerLetter = "";

            for (let i = 1; i < lines.length; i++) {

                let line = lines[i].trim();

                if (/^ANSWER\s*:/i.test(line)) {

                    answerLetter = line.split(":")[1]
                        .trim().toUpperCase();

                } else {

                    let match = line.match(/^([A-Z])\.\s*(.+)$/i);

                    if (match) {

                        options.push({
                            letter: match[1].toUpperCase(),
                            text: match[2].trim()
                        });
                    }
                }
            }

            let validAnswer = options.some(function (option) {
                return option.letter === answerLetter;
            });

            if (
                question &&
                options.length >= 2 &&
                /^[A-Z]$/.test(answerLetter) &&
                validAnswer
            ) {

                importedQuestions.push({

                    question: question,
                    options: options,
                    answer: answerLetter

                });
            }
        }

        if (importedQuestions.length === 0) {

            message.innerText =
                "Invalid format. Check your question, options and ANSWER line.";

            return;
        }

        let uploaded = await uploadQuestionsToServer(importedQuestions);

        if (!uploaded) {

            message.innerText =
                "Questions were not uploaded. Check admin login and server.";

            return;
        }

        questions = importedQuestions;

        localStorage.setItem("importedFileName", file.name);

        let fileNameElement = document.getElementById("fileName");

        if (fileNameElement) {
            fileNameElement.innerText = "Imported File: " + file.name;
        }

        message.innerText =
            importedQuestions.length + " questions uploaded successfully.";

        showCorrectScreen();
    };

    reader.onerror = function () {

        message.innerText = "Unable to read the selected file.";
    };

    reader.readAsText(file);
}


/* ==========================================
   22. IMPORT TYPED QUESTIONS
========================================== */

async function importTypedQuestions() {

    let input = document.getElementById("typedQuestions");
    let message = document.getElementById("typedImportMessage");

    if (!input || !message) return;

    let text = input.value.trim();

    if (!text) {

        message.innerText = "Please enter your questions.";

        return;
    }

    let blocks = text.split(/\r?\n\s*\r?\n/);

    let importedQuestions = [];
    let errors = [];

    blocks.forEach(function (block, index) {

        let lines = block.split(/\r?\n/)
            .map(function (line) {
                return line.trim();
            })
            .filter(function (line) {
                return line !== "";
            });

        let question = "";
        let options = {};
        let answer = "";

        lines.forEach(function (line) {

            let answerMatch = line.match(/^ANSWER\s*:\s*([A-Z])$/i);

            if (answerMatch) {

                answer = answerMatch[1].toUpperCase();

                return;
            }

            let optionMatch = line.match(/^([A-Z])\s*[.)\-:]\s*(.+)$/i);

            if (optionMatch) {

                options[optionMatch[1].toUpperCase()] =
                    optionMatch[2].trim();

                return;
            }

            question += (question ? " " : "") + line;
        });

        let letters = Object.keys(options).sort();

        if (!question) {

            errors.push("Question " + (index + 1) + ": Missing question text.");

            return;
        }

        if (letters.length < 2) {

            errors.push("Question " + (index + 1) + ": At least 2 options required.");

            return;
        }

        if (!answer || !options[answer]) {

            errors.push("Question " + (index + 1) + ": Correct answer is invalid.");

            return;
        }

        importedQuestions.push({

            question: question,

            options: letters.map(function (letter) {

                return {
                    letter: letter,
                    text: options[letter]
                };

            }),

            answer: answer

        });
    });

    if (importedQuestions.length === 0) {

        message.innerText =
            "No valid questions found.\n" + errors.join("\n");

        return;
    }

    let uploaded = await uploadQuestionsToServer(importedQuestions);

    if (!uploaded) {

        message.innerText =
            "Upload failed. Check admin login and server.";

        return;
    }

    questions = importedQuestions;

    localStorage.setItem("importedFileName", "Typed Questions");

    message.innerText =
        importedQuestions.length +
        " questions uploaded successfully." +
        (errors.length ? "\nSkipped:\n" + errors.join("\n") : "");

    showCorrectScreen();
}


/* ==========================================
   23. SAVE QUIZ TITLE
========================================== */

function saveQuizTitle() {

    let titleInput = document.getElementById("quizTitle");
    let message = document.getElementById("titleMessage");

    if (!titleInput || !message) return;

    let title = titleInput.value.trim();

    if (!title) {

        message.innerText = "Please enter a quiz title!";

        return;
    }

    localStorage.setItem("quizTitle", title);

    message.innerText = "Quiz title saved successfully!";

    let displayTitle = document.getElementById("displayQuizTitle");

    if (displayTitle) {
        displayTitle.innerText = title;
    }
}


/* ==========================================
   24. CLEAR LOCAL QUESTIONS
========================================== */

function clearQuestions() {

    questions = [];

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    selectedAnswers = [];
    quizStarted = false;

    localStorage.removeItem("quizProgress");
    localStorage.removeItem("importedFileName");

    let message = document.getElementById("importMessage");
    let fileNameElement = document.getElementById("fileName");

    if (message) {

        message.innerText =
            "Local question display cleared. Database questions remain unchanged.";
    }

    if (fileNameElement) {
        fileNameElement.innerText = "No file imported yet";
    }

    showCorrectScreen();
}


/* ==========================================
   25. CONFIRMATION BOX
========================================== */

function showConfirm(message, action) {

    let confirmBox = document.getElementById("confirmBox");
    let confirmMessage = document.getElementById("confirmMessage");

    if (!confirmBox || !confirmMessage) {

        if (window.confirm(message)) {
            action();
        }

        return;
    }

    confirmMessage.innerText = message;

    confirmAction = action;

    confirmBox.style.display = "block";
}


function confirmYes() {

    let confirmBox = document.getElementById("confirmBox");

    if (confirmBox) {
        confirmBox.style.display = "none";
    }

    if (typeof confirmAction === "function") {

        let action = confirmAction;

        confirmAction = null;

        action();
    }
}


function confirmNo() {

    let confirmBox = document.getElementById("confirmBox");

    if (confirmBox) {
        confirmBox.style.display = "none";
    }

    confirmAction = null;
}


/* ==========================================
   26. CANCEL TEST
========================================== */

function cancelTest() {

    showConfirm(
        "Are you sure you want to cancel this test?",
        function () {

            quizStarted = false;

            localStorage.removeItem("quizProgress");

            score = 0;
            questionIndex = 0;
            userAnswers = [];
            selectedAnswers = [];
            studentName = "";

            if (document.fullscreenElement) {

                document.exitFullscreen().catch(function () {});
            }

            let quizScreen = document.getElementById("quizScreen");
            let resultScreen = document.getElementById("resultScreen");
            let passwordScreen = document.getElementById("passwordScreen");
            let startScreen = document.getElementById("startScreen");
            let cancelBtn = document.getElementById("cancelBtn");

            if (quizScreen) quizScreen.style.display = "none";
            if (resultScreen) resultScreen.style.display = "none";
            if (passwordScreen) passwordScreen.style.display = "none";
            if (startScreen) startScreen.style.display = "block";
            if (cancelBtn) cancelBtn.style.display = "none";

            let nameInput = document.getElementById("studentName");

            if (nameInput) nameInput.value = "";

            showMessage("Test cancelled successfully.");
        }
    );
}


/* ==========================================
   27. ADMIN REVIEW SETTING
========================================== */

async function loadAdminReviewSetting() {

    let password = sessionStorage.getItem("adminPassword");

    if (!password) return;

    try {

        let response = await fetch("/api/admin/review-setting", {

            headers: {
                "x-admin-password": password
            }

        });

        let data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Unable to load review setting."
            );
        }

        reviewEnabled = data.reviewEnabled === true;

        updateReviewButton();

    } catch (error) {

        console.error("Review setting error:", error);

        let message = document.getElementById("reviewSettingMessage");

        if (message) {
            message.innerText = error.message;
        }
    }
}


function updateReviewButton() {

    let button = document.getElementById("reviewToggleBtn");

    if (button) {

        button.innerText = reviewEnabled
            ? "Disable Student Review"
            : "Enable Student Review";
    }

    let status = document.getElementById("reviewStatus");

    if (status) {

        status.innerText = reviewEnabled
            ? "Student answer review is currently ENABLED."
            : "Student answer review is currently DISABLED.";
    }
}


async function toggleStudentReview() {

    let password = sessionStorage.getItem("adminPassword");

    let message = document.getElementById("reviewSettingMessage");

    if (!password) {

        if (message) {
            message.innerText = "Please log in as admin first.";
        }

        return;
    }

    try {

        let response = await fetch("/api/admin/review-setting", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-admin-password": password
            },

            body: JSON.stringify({
                reviewEnabled: !reviewEnabled
            })

        });

        let data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Unable to update review setting."
            );
        }

        reviewEnabled = data.reviewEnabled === true;

        updateReviewButton();

        if (message) {
            message.innerText = data.message || "Review setting updated.";
        }

    } catch (error) {

        if (message) {
            message.innerText = error.message;
        }

        console.error("Review update error:", error);
    }
}


/* ==========================================
   28. STUDENT REVIEW PERMISSION
========================================== */

async function checkStudentReviewPermission() {

    try {

        let response = await fetch("/api/quiz/review-setting", {
            cache: "no-store"
        });

        let data = await response.json();

        return response.ok && data.reviewEnabled === true;

    } catch (error) {

        console.error("Student review permission error:", error);

        return false;
    }
}


/* ==========================================
   29. ADMIN LOGIN
========================================== */

async function adminLogin() {

    let passwordInput = document.getElementById("adminPassword");
    let message = document.getElementById("adminMessage");

    let password = passwordInput
        ? passwordInput.value
        : "";

    if (!message) return;

    if (!password.trim()) {

        message.innerText = "Please enter admin password.";

        return;
    }

    try {

        let response = await fetch("/api/admin/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                password: password
            })

        });

        let data = await response.json();

        if (!response.ok || !data.success) {

            message.innerText =
                data.message || "Admin login failed.";

            return;
        }

        sessionStorage.setItem("adminPassword", password);

        message.innerText = "Admin login successful.";

        let adminPanel = document.getElementById("adminPanel");
        let loginGate = document.getElementById("adminLoginGate");
        let loginBox = document.getElementById("adminLogin");

        if (adminPanel) adminPanel.style.display = "block";
        if (loginGate) loginGate.style.display = "none";
        if (loginBox) loginBox.style.display = "none";

        await loadAdminReviewSetting();

    } catch (error) {

        console.error("Admin login error:", error);

        message.innerText = "Unable to connect to server.";
    }
}


/* ==========================================
   30. FETCH STUDENT RESULTS
========================================== */

async function fetchStudentResults() {

    let message = document.getElementById("resultsMessage");

    if (!message) return;

    try {

        let password = sessionStorage.getItem("adminPassword");

        if (!password) {

            message.innerText = "Please log in as admin first.";

            return;
        }

        let response = await fetch("/api/admin/results", {

            headers: {
                "x-admin-password": password
            }

        });

        let data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to fetch results."
            );
        }

        let output = document.getElementById("studentResults");

        if (!output) {

            output = document.createElement("div");

            output.id = "studentResults";

            message.after(output);
        }

        if (!Array.isArray(data) || data.length === 0) {

            output.innerHTML = "";

            message.innerText = "No student results found.";

            return;
        }

        output.innerHTML = `

            <table class="results-table">

                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Score</th>
                        <th>Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>

                <tbody>

                    ${data.map(function (student) {

                        return `

                            <tr>

                                <td>${escapeHTML(student.studentName)}</td>

                                <td>${Number(student.score) || 0}</td>

                                <td>${Number(student.total) || 0}</td>

                                <td>${Number(student.percentage) || 0}%</td>

                            </tr>

                        `;

                    }).join("")}

                </tbody>

            </table>

        `;

        message.innerText = "Student results loaded successfully.";

    } catch (error) {

        message.innerText = error.message;

        console.error("Fetch results error:", error);
    }
}


/* ==========================================
   31. DELETE ALL QUESTIONS
========================================== */

async function deleteAllQuestions() {

    if (!sessionStorage.getItem("adminPassword")) {

        showMessage("Please log in as admin first.");

        return;
    }

    showConfirm(
        "Are you sure you want to delete ALL questions from the database?",
        async function () {

            let message = document.getElementById("adminMessage");

            try {

                let response = await fetch("/api/admin/questions", {

                    method: "DELETE",

                    headers: {
                        "x-admin-password":
                            sessionStorage.getItem("adminPassword") || ""
                    }

                });

                let data = await response.json();

                if (!response.ok) {

                    throw new Error(
                        data.message || "Failed to delete questions."
                    );
                }

                questions = [];

                score = 0;
                questionIndex = 0;
                userAnswers = [];
                selectedAnswers = [];
                quizStarted = false;

                localStorage.removeItem("quizProgress");
                localStorage.removeItem("importedFileName");

                if (message) {

                    message.innerText =
                        data.message || "All questions deleted successfully.";
                }

                showCorrectScreen();

                let fileNameElement = document.getElementById("fileName");

                if (fileNameElement) {
                    fileNameElement.innerText = "No file imported yet";
                }

                let importMessage = document.getElementById("importMessage");

                if (importMessage) {
                    importMessage.innerText = "No questions available.";
                }

            } catch (error) {

                if (message) {
                    message.innerText = error.message;
                }

                console.error("Delete questions error:", error);
            }
        }
    );
}


/* ==========================================
   32. DELETE ALL RESULTS
========================================== */

async function deleteAllResults() {

    if (!sessionStorage.getItem("adminPassword")) {

        showMessage("Please log in as admin first.");

        return;
    }

    showConfirm(
        "Are you sure you want to delete ALL student results?",
        async function () {

            let message = document.getElementById("resultsMessage");

            try {

                let response = await fetch("/api/admin/results", {

                    method: "DELETE",

                    headers: {
                        "x-admin-password":
                            sessionStorage.getItem("adminPassword") || ""
                    }

                });

                let data = await response.json();

                if (!response.ok) {

                    throw new Error(
                        data.message || "Failed to delete results."
                    );
                }

                if (message) {

                    message.innerText =
                        data.message || "All student results deleted.";
                }

                let output = document.getElementById("studentResults");

                if (output) {
                    output.innerHTML = "";
                }

            } catch (error) {

                if (message) {
                    message.innerText = error.message;
                }

                console.error("Delete results error:", error);
            }
        }
    );
}


/* ==========================================
   33. ADMIN LOGOUT
========================================== */

function adminLogout() {

    sessionStorage.removeItem("adminPassword");

    let panel = document.getElementById("adminPanel");
    let gate = document.getElementById("adminLoginGate");
    let loginBox = document.getElementById("adminLogin");

    if (panel) panel.style.display = "none";
    if (gate) gate.style.display = "block";
    if (loginBox) loginBox.style.display = "block";

    let password = document.getElementById("adminPassword");

    if (password) {
        password.value = "";
    }

    let message = document.getElementById("adminMessage");

    if (message) {
        message.innerText = "Logged out successfully.";
    }
}


/* ==========================================
   34. KEYBOARD RESTRICTIONS
========================================== */

// Ctrl + Q returns to the start screen
document.addEventListener("keydown", function (event) {

    if (
        quizStarted &&
        event.ctrlKey &&
        event.key.toLowerCase() === "q"
    ) {

        event.preventDefault();

        saveQuizProgress();

        quizStarted = false;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        }

        let quizScreen = document.getElementById("quizScreen");
        let resultScreen = document.getElementById("resultScreen");
        let startScreen = document.getElementById("startScreen");

        if (quizScreen) quizScreen.style.display = "none";
        if (resultScreen) resultScreen.style.display = "none";
        if (startScreen) startScreen.style.display = "block";
    }
});


// Prevent Escape from exiting fullscreen during the quiz
document.addEventListener("keydown", function (event) {

    if (!quizStarted) return;

    if (event.key === "Escape") {

        event.preventDefault();

        event.stopPropagation();
    }
});


// Disable right-click during the quiz
document.addEventListener("contextmenu", function (event) {

    if (quizStarted) {
        event.preventDefault();
    }
});
