
/* =========================================
   1. GLOBAL VARIABLES
========================================= */

let score = 0;
let questionIndex = 0;
let userAnswers = [];
let quizStarted = false;
let studentName = "";
let questions = [];
let pendingQuestions = [];

const TEST_PASSWORD = "1234";


/* =========================================
   2. COMMON HELPER FUNCTIONS
========================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, text) {
    let element = getElement(id);

    if (element) {
        element.innerText = text;
    }
}

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
        return String(option.letter || "")
            .trim()
            .toUpperCase();
    }

    return String.fromCharCode(65 + index);
}

function getOptionText(option) {
    if (typeof option === "object" && option !== null) {
        return String(option.text || "");
    }

    return String(option ?? "");
}

function normalizeQuestions(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.questions)) {
        return data.questions;
    }

    return [];
}

async function readResponse(response) {
    let text = await response.text();

    if (!text.trim()) {
        throw new Error(
            "Server returned an empty response. Check server.js."
        );
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(
            "Server returned invalid JSON. Check the backend route."
        );
    }
}


/* =========================================
   3. PAGE LOADING
========================================= */

window.addEventListener("DOMContentLoaded", function () {

    loadQuestionsFromServer();

    let savedTitle = localStorage.getItem("quizTitle");

    if (savedTitle) {
        setText("displayQuizTitle", savedTitle);

        let titleInput = getElement("quizTitle");

        if (titleInput) {
            titleInput.value = savedTitle;
        }
    }

    let savedFile = localStorage.getItem("importedFileName");

    setText(
        "fileName",
        savedFile
            ? "Imported File: " + savedFile
            : "Questions are loaded from the server"
    );

    // Keep admin panel hidden when the page opens.
    if (getElement("adminLogin")) {
        getElement("adminLogin").style.display = "block";
    }

    if (getElement("adminPanel")) {
        getElement("adminPanel").style.display = "none";
    }
});


/* =========================================
   4. LOAD QUESTIONS FROM SERVER
========================================= */

async function loadQuestionsFromServer() {

    setText("importMessage", "Loading questions...");

    try {

        let response = await fetch("/api/quiz/questions");
        let data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load questions."
            );
        }

        questions = normalizeQuestions(data);

        showCorrectScreen();

        setText(
            "importMessage",
            questions.length
                ? questions.length + " questions loaded from server."
                : "No questions available on the server."
        );

    } catch (error) {

        questions = [];

        showCorrectScreen();

        setText(
            "importMessage",
            "Cannot load questions. Check the server connection."
        );

        console.error("Load questions error:", error);
    }
}


function showCorrectScreen() {

    let noQuestions = getElement("noQuestions");
    let startScreen = getElement("startScreen");
    let quizScreen = getElement("quizScreen");

    if (questions.length === 0) {

        if (noQuestions) noQuestions.style.display = "block";
        if (startScreen) startScreen.style.display = "none";
        if (quizScreen) quizScreen.style.display = "none";

    } else {

        if (noQuestions) noQuestions.style.display = "none";
        if (startScreen) startScreen.style.display = "block";
        if (quizScreen) quizScreen.style.display = "none";
    }
}


/* =========================================
   5. TEST PASSWORD
========================================= */

function showPasswordScreen() {

    if (questions.length === 0) {
        alert("No questions are available.");
        return;
    }

    getElement("startScreen").style.display = "none";
    getElement("passwordScreen").style.display = "block";

    getElement("testPassword").value = "";
    setText("passwordMessage", "");
}


function verifyPassword() {

    let enteredPassword = getElement("testPassword").value;

    if (enteredPassword === TEST_PASSWORD) {

        getElement("passwordScreen").style.display = "none";

        startQuiz();

    } else {

        setText(
            "passwordMessage",
            "Incorrect password. Please try again."
        );
    }
}


/* =========================================
   6. START QUIZ
========================================= */

function startQuiz() {

    if (questions.length === 0) {
        alert("No questions are available.");
        return;
    }

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    quizStarted = true;

    if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
    ) {
        document.documentElement.requestFullscreen().catch(function () {
            // Continue if fullscreen is unavailable.
        });
    }
     let nameInput = document.getElementById("studentName");
     let nameError = document.getElementById("nameError");
     studentName = nameInput.value.trim();

    if (studentName === "") {
        nameError.innerText = "Please enter your name.";
        nameInput.focus();
        return;
    }
    getElement("startScreen").style.display = "none";
    getElement("quizScreen").style.display = "block";
    getElement("resultScreen").style.display = "none";

    showQuestion();
}


/* =========================================
   7. DISPLAY QUESTION
========================================= */

function showQuestion() {

    let q = questions[questionIndex];

    if (!q || !Array.isArray(q.options)) {
        return;
    }

    setText(
        "questionNumber",
        "Question " + (questionIndex + 1) +
        " of " + questions.length
    );

    setText("question", q.question || "");

    let optionsHTML = "";

    q.options.forEach(function (option, index) {

        let letter = getOptionLetter(option, index);
        let optionText = getOptionText(option);

        let isChecked =
            userAnswers[questionIndex] === letter;

        let isDisabled =
            userAnswers[questionIndex] !== undefined;

        optionsHTML += `
            <label style="display:block; margin:10px 0;">
                <input
                    type="radio"
                    name="answer"
                    value="${escapeHTML(letter)}"
                    ${isChecked ? "checked" : ""}
                    ${isDisabled ? "disabled" : ""}
                    onchange="answerSelected()"
                >
                ${escapeHTML(letter)}. ${escapeHTML(optionText)}
            </label>
        `;
    });

    getElement("options").innerHTML = optionsHTML;

    getElement("clearBtn").disabled = true;
    getElement("submitBtn").disabled = true;

    setText("feedback", "");

    let nextBtn = getElement("nextBtn");

    if (userAnswers[questionIndex] !== undefined) {

        nextBtn.style.display = "inline-block";

        nextBtn.innerText =
            questionIndex === questions.length - 1
                ? "Show Result"
                : "Next";

    } else {

        nextBtn.style.display = "none";
    }

    let previousBtn = getElement("previousBtn");

    if (previousBtn) {
        previousBtn.disabled = questionIndex === 0;
    }
}


/* =========================================
   8. ANSWER SELECTION
========================================= */

function answerSelected() {

    if (userAnswers[questionIndex] !== undefined) {
        return;
    }

    getElement("clearBtn").disabled = false;
    getElement("submitBtn").disabled = false;
}


/* =========================================
   9. CLEAR SELECTED ANSWER
========================================= */

function clearAnswer() {

    if (userAnswers[questionIndex] !== undefined) {
        return;
    }

    document.querySelectorAll('input[name="answer"]').forEach(
        function (radio) {
            radio.checked = false;
        }
    );

    getElement("clearBtn").disabled = true;
    getElement("submitBtn").disabled = true;

    setText("feedback", "");
}


/* =========================================
   10. SUBMIT ANSWER
========================================= */

function checkAnswer() {

    if (userAnswers[questionIndex] !== undefined) {
        return;
    }

    let selected = document.querySelector(
        'input[name="answer"]:checked'
    );

    if (!selected) {
        setText("feedback", "Please select an answer!");
        return;
    }

    userAnswers[questionIndex] =
        selected.value.trim().toUpperCase();

    document.querySelectorAll('input[name="answer"]').forEach(
        function (radio) {
            radio.disabled = true;
        }
    );

    getElement("clearBtn").disabled = true;
    getElement("submitBtn").disabled = true;

    setText("feedback", "");

    let nextBtn = getElement("nextBtn");

    nextBtn.style.display = "inline-block";

    nextBtn.innerText =
        questionIndex === questions.length - 1
            ? "Show Result"
            : "Next";
}


/* =========================================
   11. NEXT QUESTION
========================================= */

function nextQuestion() {

    if (userAnswers[questionIndex] === undefined) {
        return;
    }

    if (questionIndex < questions.length - 1) {

        questionIndex++;
        showQuestion();

    } else {

        completeTest();
    }
}


/* =========================================
   12. PREVIOUS QUESTION
========================================= */

function previousQuestion() {

    if (questionIndex > 0) {
        questionIndex--;
        showQuestion();
    }
}


/* =========================================
   13. COMPLETE TEST AND SAVE RESULT
========================================= */

async function completeTest() {

    if (quizStarted === false) {
        return;
    }

    quizStarted = false;

    let quizScreen = getElement("quizScreen");
    let resultScreen = getElement("resultScreen");

    if (!resultScreen) {
        console.error('Missing HTML element: resultScreen');
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

    let percentage = total > 0
        ? Number(((score / total) * 100).toFixed(2))
        : 0;

    setText("score", "Your Score: " + score + " / " + total);
    setText("percentage", "Percentage: " + percentage + "%");
    setText("resultMessage", "Test Completed!");

    showFinalReview();

    window.scrollTo(0, 0);

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
                percentage: percentage
            })
        });

        let data = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to save result."
            );
        }

        console.log("Quiz result saved successfully.");

    } catch (error) {

        console.error("Result saving error:", error);
    }
}


/* =========================================
   14. FINAL ANSWER REVIEW
========================================= */

function showFinalReview() {

    let reviewHTML = "";

    questions.forEach(function (q, index) {

        let selectedLetter = String(userAnswers[index] || "")
            .trim().toUpperCase();

        let correctLetter = String(q.answer || "")
            .trim().toUpperCase();

        let selectedOption = q.options.find(
            function (option, optionIndex) {
                return getOptionLetter(option, optionIndex) === selectedLetter;
            }
        );

        let correctOption = q.options.find(
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
                    ${selectedLetter
                        ? escapeHTML(selectedLetter + ". " + selectedText)
                        : "Not answered"}
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

    let review = getElement("answerReview");

    if (review) {
        review.innerHTML = reviewHTML;
        review.style.display = "block";
    }
}


/* =========================================
   15. RESTART QUIZ
========================================= */

function restartQuiz() {

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    quizStarted = false;

    getElement("resultScreen").style.display = "none";
    getElement("quizScreen").style.display = "none";
    getElement("startScreen").style.display = "block";
}


/* =========================================
   16. ADMIN LOGIN
========================================= */

window.adminLogin = function () {
    let passwordInput = document.getElementById("adminPassword");
    let message = document.getElementById("adminMessage");

    if (!passwordInput || !message) {
        console.error("Admin password input or message element is missing.");
        return;
    }

    let password = passwordInput.value.trim();

    if (!password) {
        message.innerText = "Please enter admin password.";
        return;
    }

    fetch("/api/admin/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: password })
    })
    .then(function (response) {
        return response.text().then(function (text) {
            let data;

            try {
                data = JSON.parse(text);
            } catch (error) {
                throw new Error("Invalid server response. Check server.js.");
            }

            if (!response.ok) {
                throw new Error(data.message || "Admin login failed.");
            }

            return data;
        });
    })
    .then(function (data) {
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
        message.innerText = data.message || "Admin login successful.";
        sessionStorage.setItem("adminPassword", password);
    })
    .catch(function (error) {
        message.innerText = error.message;
        console.error("Admin login error:", error);
    });
};

/* =========================================
   17. ADMIN LOGOUT
========================================= */

function adminLogout() {

    sessionStorage.removeItem("adminPassword");

    getElement("adminPanel").style.display = "none";
    getElement("adminLogin").style.display = "block";

    getElement("adminPassword").value = "";

    setText("adminMessage", "Logged out successfully.");
}


/* =========================================
   18. UPLOAD QUESTIONS TO MONGODB
========================================= */

async function uploadQuestionsToServer() {

    let password = sessionStorage.getItem("adminPassword");
    let message = getElement("uploadMessage");

    if (!password) {
        message.innerText = "Please log in as admin first.";
        return;
    }

    if (pendingQuestions.length === 0) {
        message.innerText = "Import questions before uploading.";
        return;
    }

    try {

        message.innerText = "Uploading questions...";

        let response = await fetch("/api/admin/questions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-admin-password": password
            },
            body: JSON.stringify({
                questions: pendingQuestions
            })
        });

        let data = await readResponse(response);

        if (!response.ok) {

            if (response.status === 401) {
                sessionStorage.removeItem("adminPassword");

                getElement("adminPanel").style.display = "none";
                getElement("adminLogin").style.display = "block";
            }

            throw new Error(
                data.message || "Question upload failed."
            );
        }

        questions = pendingQuestions.slice();

        localStorage.setItem(
            "importedFileName",
            "Imported Questions"
        );

        message.innerText =
            data.message || "Questions uploaded successfully!";

        setText("questionCount", questions.length);

        setText(
            "fileName",
            localStorage.getItem("importedFileName")
        );

        showCorrectScreen();

    } catch (error) {

        message.innerText = error.message;

        console.error("Question upload error:", error);
    }
}


/* =========================================
   19. AIKEN QUESTION PARSER
========================================= */

function parseQuestions(text) {

    let blocks = text.trim().split(/\r?\n\s*\r?\n/);
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

            let answerMatch =
                line.match(/^ANSWER\s*:\s*([A-Z])$/i);

            if (answerMatch) {
                answer = answerMatch[1].toUpperCase();
                return;
            }

            let optionMatch =
                line.match(/^([A-Z])\s*[.)\-:]\s*(.+)$/i);

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
            errors.push("Question " + (index + 1) + ": Invalid correct answer.");
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

    return {
        questions: importedQuestions,
        errors: errors
    };
}


/* =========================================
   20. IMPORT QUESTIONS FROM FILE
========================================= */

function importQuestions() {

    let fileInput = getElement("questionFile");
    let message = getElement("importMessage");

    if (!fileInput || !fileInput.files.length) {
        message.innerText = "Please select a .txt file.";
        return;
    }

    let file = fileInput.files[0];
    let reader = new FileReader();

    reader.onload = function (event) {

        let result = parseQuestions(event.target.result);

        if (result.questions.length === 0) {
            message.innerText =
                "No valid questions found.\n" +
                result.errors.join("\n");
            return;
        }

        // Prepare questions only. Admin uploads them separately.
        pendingQuestions = result.questions;

        setText("questionCount", pendingQuestions.length);

        setText("fileName", "Selected File: " + file.name);

        message.innerText =
            pendingQuestions.length +
            " questions prepared. Log in as admin to upload." +
            (result.errors.length
                ? "\nSkipped:\n" + result.errors.join("\n")
                : "");
    };

    reader.onerror = function () {
        message.innerText = "Unable to read the selected file.";
    };

    reader.readAsText(file);
}


/* =========================================
   21. IMPORT TYPED QUESTIONS
========================================= */

function importTypedQuestions() {

    let input = getElement("typedQuestions");
    let message = getElement("typedImportMessage");

    if (!input || !input.value.trim()) {
        message.innerText = "Please enter your questions.";
        return;
    }

    let result = parseQuestions(input.value);

    if (result.questions.length === 0) {
        message.innerText =
            "No valid questions found.\n" +
            result.errors.join("\n");
        return;
    }

    // Prepare questions only. Admin uploads them separately.
    pendingQuestions = result.questions;

    setText("questionCount", pendingQuestions.length);

    message.innerText =
        pendingQuestions.length +
        " questions prepared. Log in as admin to upload." +
        (result.errors.length
            ? "\nSkipped:\n" + result.errors.join("\n")
            : "");
}


/* =========================================
   22. SAVE QUIZ TITLE
========================================= */

function saveQuizTitle() {

    let titleInput = getElement("quizTitle");
    let message = getElement("titleMessage");

    if (!titleInput || !message) {
        return;
    }

    let title = titleInput.value.trim();

    if (!title) {
        message.innerText = "Please enter a quiz title!";
        return;
    }

    localStorage.setItem("quizTitle", title);

    message.innerText = "Quiz title saved successfully!";

    setText("displayQuizTitle", title);
}


/* =========================================
   23. CLEAR PREPARED QUESTIONS
========================================= */

function clearQuestions() {

    pendingQuestions = [];

    setText("questionCount", "0");
    setText("importMessage", "Prepared questions cleared.");
    setText("typedImportMessage", "Prepared questions cleared.");
    setText("fileName", "No file imported yet");

    let fileInput = getElement("questionFile");

    if (fileInput) {
        fileInput.value = "";
    }

    let typedInput = getElement("typedQuestions");

    if (typedInput) {
        typedInput.value = "";
    }

    // Does not delete questions from MongoDB.
}


/* =========================================
   24. KEYBOARD RESTRICTIONS
========================================= */

document.addEventListener("keydown", function (event) {

    if (
        quizStarted &&
        event.ctrlKey &&
        event.key.toLowerCase() === "q"
    ) {
        event.preventDefault();

        quizStarted = false;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        }

        getElement("quizScreen").style.display = "none";
        getElement("resultScreen").style.display = "none";
        getElement("startScreen").style.display = "block";
    }

    if (quizStarted && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
    }
});



function deleteUploadedQuestions() {

    let password = sessionStorage.getItem("adminPassword");

    if (!password) {
        alert("Please log in as admin first.");
        return;
    }

    if (!confirm("Are you sure you want to delete ALL uploaded questions?")) {
        return;
    }

    fetch("/api/admin/questions", {
        method: "DELETE",
        headers: {
            "x-admin-password": password
        }
    })
    .then(response => response.json())
    .then(data => {

        if (!data.deletedCount && data.deletedCount !== 0) {
            alert(data.message || "Delete failed.");
            return;
        }

        alert(data.message);

        questions = [];
        pendingQuestions = [];

        localStorage.removeItem("quizQuestions");

        let count = document.getElementById("questionCount");
        if (count) count.innerText = "0";

        let message = document.getElementById("uploadMessage");
        if (message) message.innerText = "All uploaded questions deleted.";

        showCorrectScreen();

    })
    .catch(error => {
        console.error(error);
        alert("Server connection failed.");
    });
}

window.deleteUploadedQuestions = deleteUploadedQuestions;


/* =========================================
   25. DISABLE RIGHT-CLICK DURING QUIZ
========================================= */

document.addEventListener("contextmenu", function (event) {

    if (quizStarted) {
        event.preventDefault();
    }
});



function loadStudentResults() {

    let table = document.getElementById("resultsTable");
    let message = document.getElementById("resultsMessage");

    table.innerHTML = "";
    message.innerText = "Loading results...";

    // Use the same admin password key as your existing login code.
    let adminPassword = sessionStorage.getItem("adminPassword");

    if (!adminPassword) {
        message.innerText = "Please log in as admin first.";
        return;
    }

    fetch("/api/admin/results", {
        method: "GET",
        headers: {
            "x-admin-password": adminPassword
        }
    })
    .then(function (response) {
        if (!response.ok) {
            throw new Error("Unable to fetch results. Please log in again.");
        }

        return response.json();
    })
    .then(function (results) {

        message.innerText = "";

        if (results.length === 0) {
            message.innerText = "No student results available yet.";
            return;
        }

        results.forEach(function (result, index) {

            let row = document.createElement("tr");

            let submittedAt = result.createdAt
                ? new Date(result.createdAt).toLocaleString()
                : "N/A";

            let values = [
                index + 1,
                result.studentName || "Unknown",
                result.score,
                result.total,
                result.percentage + "%",
                submittedAt
            ];

            values.forEach(function (value) {
                let cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    })
    .catch(function (error) {
        message.innerText = error.message;
    });
}

function deleteAllResults() {

    let confirmDelete = confirm(
        "Are you sure you want to delete ALL student results? This cannot be undone."
    );

    if (!confirmDelete) {
        return;
    }

    let adminPassword =
        sessionStorage.getItem("adminPassword");

    if (!adminPassword) {
        alert("Please log in as admin first.");
        return;
    }

    fetch("/api/admin/results", {
        method: "DELETE",
        headers: {
            "x-admin-password": adminPassword
        }
    })
    .then(function (response) {
        return response.json().then(function (data) {
            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to delete results."
                );
            }

            return data;
        });
    })
    .then(function (data) {
        alert(
            data.message +
            "\nDeleted results: " +
            data.deletedCount
        );

        loadStudentResults();
    })
    .catch(function (error) {
        alert(error.message);
    });
}

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.uploadQuestionsToServer = uploadQuestionsToServer;

window.importQuestions = importQuestions;
window.importTypedQuestions = importTypedQuestions;
window.saveQuizTitle = saveQuizTitle;
window.clearQuestions = clearQuestions;