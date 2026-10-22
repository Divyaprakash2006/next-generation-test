/* ==============================
   1. GLOBAL VARIABLES
============================== */

let score = 0;
let questionIndex = 0;
let userAnswers = [];
let selectedAnswers = [];
let quizStarted = false;
let studentName = "";
let questions = [];
let resultSubmitting = false;


/* ==============================
   2. PAGE LOADING
============================== */

window.addEventListener("DOMContentLoaded", async function () {
    let savedTitle = localStorage.getItem("quizTitle");
    let displayTitle = document.getElementById("displayQuizTitle");
    let titleInput = document.getElementById("quizTitle");

    if (savedTitle && displayTitle) displayTitle.innerText = savedTitle;
    if (savedTitle && titleInput) titleInput.value = savedTitle;

    let fileName = localStorage.getItem("importedFileName");
    let fileNameElement = document.getElementById("fileName");
    if (fileNameElement) {
        fileNameElement.innerText = fileName
            ? "Imported File: " + fileName
            : "Questions are loaded from the server";
    }

    await loadQuestionsFromServer();

    // Restore progress only after the server questions have loaded.
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

         // Show Cancel Test button after page refresh
        let cancelBtn = document.getElementById("cancelBtn");

        if (cancelBtn) {
            cancelBtn.style.display = "block";
        }

        showQuestion();
    }
});

function showMessage(message) {
    document.getElementById("messageText").innerText = message;
    document.getElementById("customMessage").style.display = "block";
}
function closeMessage() {
    document.getElementById("customMessage").style.display = "none";
}


/* ==============================
   3. LOAD QUESTIONS FROM SERVER
============================== */

async function loadQuestionsFromServer() {
    let message = document.getElementById("importMessage");

    try {
        if (message) {
            message.innerText = "Loading questions...";
        }

        let response = await fetch("/api/quiz/questions");
        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load questions.");
        }

        // Supports either an array or { questions: [...] }
        questions = Array.isArray(data)
            ? data
            : (data.questions || []);

        showCorrectScreen();

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


function showCorrectScreen() {
    let noQuestions = document.getElementById("noQuestions");
    let startScreen = document.getElementById("startScreen");
    let quizScreen = document.getElementById("quizScreen");

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


/* ==============================
   4. HTML TEXT SAFETY
============================== */

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


/* ==============================
   5. TEST PASSWORD
============================== */

const TEST_PASSWORD = "1234";


function showPasswordScreen() {
    if (questions.length === 0) {
        alert("No questions are available.");
        return;
    }

    document.getElementById("startScreen").style.display = "none";
    document.getElementById("passwordScreen").style.display = "block";

    document.getElementById("testPassword").value = "";
    document.getElementById("passwordMessage").innerText = "";
}


function verifyPassword() {
    let enteredPassword =
        document.getElementById("testPassword").value;

    if (enteredPassword === TEST_PASSWORD) {
        document.getElementById("passwordScreen").style.display = "none";
        startQuiz();
    } else {
        document.getElementById("passwordMessage").innerText =
            "Incorrect password. Please try again.";
    }
}


/* ==============================
   6. START QUIZ
============================== */

function startQuiz() {
    if (questions.length === 0) {
        alert("No questions are available.");
        return;
    }

    // Validate student name before changing screens or starting the quiz.
    let nameInput = document.getElementById("studentName");
    if (nameInput) {
        studentName = nameInput.value.trim();
        if (!studentName) {
            alert("Please enter the student name.");
            let passwordScreen = document.getElementById("passwordScreen");
            let startScreen = document.getElementById("startScreen");
            if (passwordScreen) passwordScreen.style.display = "none";
            if (startScreen) startScreen.style.display = "block";
            return;
        }
    }

    score = 0;
    questionIndex = 0;
    userAnswers = [];
    selectedAnswers = [];
    quizStarted = true;
    saveQuizProgress();

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
    }
    document.getElementById("cancelBtn").style.display = "inline-block";
    document.getElementById("noQuestions").style.display = "none";
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("quizScreen").style.display = "block";
    document.getElementById("resultScreen").style.display = "none";
    showQuestion();
}


/* ==============================
   7. DISPLAY QUESTION
============================== */

function showQuestion() {
    let q = questions[questionIndex];
    if (!q) return;

    document.getElementById("questionNumber").innerText =
        "Question " + (questionIndex + 1) + " of " + questions.length;
    document.getElementById("question").innerText = q.question || "";

    let optionsHTML = "";
    q.options.forEach(function (option, index) {
        let letter = getOptionLetter(option, index);
        let optionText = getOptionText(option);
        optionsHTML += `
            <label style="display:block; margin:10px 0;">
                <input type="radio" name="answer" value="${escapeHTML(letter)}"
                    onchange="answerSelected()">
                ${escapeHTML(letter)}. ${escapeHTML(optionText)}
            </label>`;
    });
    document.getElementById("options").innerHTML = optionsHTML;

    let submitted = userAnswers[questionIndex] != null && userAnswers[questionIndex] !== "";
    let selected = selectedAnswers[questionIndex];
    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {
        radio.checked = submitted
            ? radio.value === userAnswers[questionIndex]
            : radio.value === selected;
        // Previously submitted answers remain editable when navigating back.
        radio.disabled = false;
    });

    document.getElementById("clearBtn").disabled = !selected || submitted;
    document.getElementById("submitBtn").disabled = !selected || submitted;
    document.getElementById("feedback").innerText = "";

    let nextBtn = document.getElementById("nextBtn");
    if (submitted) {
        nextBtn.style.display = "inline-block";
        nextBtn.innerText = questionIndex === questions.length - 1 ? "Show Result" : "Next";
    } else {
        nextBtn.style.display = "none";
    }
    let previousBtn = document.getElementById("previousBtn");
    if (previousBtn) previousBtn.disabled = questionIndex === 0;
    // Previous Question button visibility
 if (previousBtn) {
    if (questionIndex === 0) {
        previousBtn.style.display = "none";
        previousBtn.disabled = true;
    } else {
        previousBtn.style.display = "inline-block";
        previousBtn.disabled = false;
    }
}
}


/* ==============================
   8. ANSWER SELECTION
============================== */

function answerSelected() {
    let selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return;

    // If the student changes an earlier answer, require them to submit it again.
    delete userAnswers[questionIndex];
    selectedAnswers[questionIndex] = selected.value.trim().toUpperCase();
    document.getElementById("nextBtn").style.display = "none";
    document.getElementById("clearBtn").disabled = false;
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("feedback").innerText = "";
    saveQuizProgress();
}


/* ==============================
   9. CLEAR SELECTED ANSWER
============================== */

function clearAnswer() {
    // Clearing is allowed even after navigating back to a submitted question.
    delete userAnswers[questionIndex];
    delete selectedAnswers[questionIndex];
    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {
        radio.checked = false;
        radio.disabled = false;
    });
    document.getElementById("clearBtn").disabled = true;
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("nextBtn").style.display = "none";
    document.getElementById("feedback").innerText = "";
    saveQuizProgress();
}


/* ==============================
   10. SUBMIT ANSWER
============================== */

function checkAnswer() {
    let selected = document.querySelector('input[name="answer"]:checked');
    let feedback = document.getElementById("feedback");
    if (!selected) {
        feedback.innerText = "Please select an answer!";
        return;
    }

    let answer = selected.value.trim().toUpperCase();
    userAnswers[questionIndex] = answer;
    selectedAnswers[questionIndex] = answer;
     feedback.innerText = "Answer saved in Server!";

    document.querySelectorAll('input[name="answer"]').forEach(function (radio) {
        radio.disabled = true;
    });
    document.getElementById("clearBtn").disabled = true;
    document.getElementById("submitBtn").disabled = true;
    let nextBtn = document.getElementById("nextBtn");
    nextBtn.style.display = "inline-block";
    nextBtn.innerText = questionIndex === questions.length - 1 ? "Show Result" : "Next";
    saveQuizProgress();
}


/* ==============================
   11. NEXT QUESTION
============================== */

function nextQuestion() {
    if (userAnswers[questionIndex] == null || userAnswers[questionIndex] === "") return;
    if (questionIndex < questions.length - 1) {
        questionIndex++;
        saveQuizProgress();
        showQuestion();
    } else {
        completeTest();
    }
}


/* ==============================
   12. PREVIOUS QUESTION
============================== */

function previousQuestion() {
    if (questionIndex > 0) {
        questionIndex--;
        saveQuizProgress();
        showQuestion();
    }
    
}



/* ==============================
   13. COMPLETE TEST AND SAVE RESULT
============================== */

async function completeTest() {
    // Prevent double-clicks from submitting the same result multiple times.
    if (resultSubmitting) return;
    resultSubmitting = true;
    quizStarted = false;
    localStorage.removeItem("quizProgress");

    let quizScreen = document.getElementById("quizScreen");
    let resultScreen = document.getElementById("resultScreen");

    if (!resultScreen) {
        console.error('HTML is missing id="resultScreen"');
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

    document.getElementById("score").innerText =
        "Your Score: " + score + " / " + total;

    document.getElementById("percentage").innerText =
        "Percentage: " + percentageValue.toFixed(2) + "%";

    document.getElementById("resultMessage").innerText =
        "Test Completed!";
   let cancelBtn = document.getElementById("cancelBtn");

  if (cancelBtn) {
    cancelBtn.style.display = "none";
   }
    showFinalReview();
    window.scrollTo(0, 0);

    // Save result to MongoDB through the backend.
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
                percentage: Number(percentageValue.toFixed(2))
            })
        });

        let data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save result.");
        }

        console.log("Quiz result saved:", data);

    } catch (error) {
        console.error("Result saving error:", error);
        let resultMessage = document.getElementById("resultMessage");
        if (resultMessage) {
            resultMessage.innerText =
                "Test completed, but the result could not be saved. Please contact the administrator.";
        }
    } finally {
        resultSubmitting = false;
    }
}


/* ==============================
   14. FINAL ANSWER REVIEW
============================== */

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

    let reviewElement = document.getElementById("answerReview");

    if (reviewElement) {
        reviewElement.innerHTML = reviewHTML;
        reviewElement.style.display = "block";
    }
}


/* ==============================
   15. RESTART QUIZ
============================== */

function restartQuiz() {
    resultSubmitting = false;
    score = 0;
    questionIndex = 0;
    userAnswers = [];
    selectedAnswers = [];
    quizStarted = false;
    studentName = "";
    localStorage.removeItem("quizProgress");

    document.getElementById("resultScreen").style.display = "none";
    document.getElementById("quizScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "block";
    let nameInput = document.getElementById("studentName");
    if (nameInput) nameInput.value = "";
}


/* ==============================
   SAVE AND RESTORE QUIZ PROGRESS
============================== */

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
    localStorage.setItem("quizProgress", JSON.stringify(progress));
}

function loadQuizProgress() {
    let saved = localStorage.getItem("quizProgress");
    if (!saved) return false;
    try {
        let progress = JSON.parse(saved);
        if (!progress || progress.quizStarted !== true) return false;
        // Avoid restoring old answers if the server quiz has changed.
        if (progress.questionCount !== questions.length) {
            localStorage.removeItem("quizProgress");
            return false;
        }
        questionIndex = Number.isInteger(progress.questionIndex)
            ? Math.max(0, Math.min(progress.questionIndex, questions.length - 1))
            : 0;
        userAnswers = Array.isArray(progress.userAnswers) ? progress.userAnswers : [];
        selectedAnswers = Array.isArray(progress.selectedAnswers) ? progress.selectedAnswers : [];
        studentName = String(progress.studentName || "").trim();
        if (!studentName) {
            localStorage.removeItem("quizProgress");
            return false;
        }
        // Keep both answer arrays aligned to the current question count.
        userAnswers.length = questions.length;
        selectedAnswers.length = questions.length;
        quizStarted = true;
        return true;
    } catch (error) {
        localStorage.removeItem("quizProgress");
        return false;
    }
}


/* ==============================
   16. UPLOAD QUESTIONS TO SERVER
============================== */

async function uploadQuestionsToServer(questionsToUpload) {
    let passwordElement = document.getElementById("adminPassword");
    let message = document.getElementById("uploadMessage");

    if (!passwordElement || !message) {
        alert(
            'Add an input with id="adminPassword" and an element with id="uploadMessage" to your import page.'
        );
        return false;
    }

    let password = passwordElement.value.trim();

    if (!password) {
        message.innerText = "Enter the admin password.";
        return false;
    }

    if (!Array.isArray(questionsToUpload) ||
        questionsToUpload.length === 0) {
        message.innerText = "Import valid questions first.";
        return false;
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


/* ==============================
   17. IMPORT QUESTIONS FROM FILE
============================== */

function importQuestions() {
    let fileInput = document.getElementById("questionFile");
    let file = fileInput && fileInput.files[0];
    let message = document.getElementById("importMessage");

    if (!file) {
        message.innerText = "Please select a text file.";
        return;
    }

    let reader = new FileReader();

    reader.onload = async function (event) {
        let text = event.target.result.trim();
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
                "Invalid format. Check your question, options, and ANSWER line.";
            return;
        }

        // Upload to MongoDB before showing success.
        let uploaded = await uploadQuestionsToServer(importedQuestions);

        if (!uploaded) {
            message.innerText =
                "Questions were not uploaded. Check the admin password and server.";
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

    reader.readAsText(file);
}


/* ==============================
   18. IMPORT TYPED QUESTIONS
============================== */

async function importTypedQuestions() {
    let input = document.getElementById("typedQuestions");
    let message = document.getElementById("typedImportMessage");

    if (!input || !message) {
        return;
    }

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

            let optionMatch = line.match(
                /^([A-Z])\s*[.)\-:]\s*(.+)$/i
            );

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
            "Upload failed. Check the admin password and server.";
        return;
    }

    questions = importedQuestions;
    localStorage.setItem("importedFileName", "Typed Questions");

    message.innerText =
        importedQuestions.length + " questions uploaded successfully." +
        (errors.length ? "\nSkipped:\n" + errors.join("\n") : "");

    showCorrectScreen();
}


/* ==============================
   19. SAVE QUIZ TITLE
============================== */

function saveQuizTitle() {
    let titleInput = document.getElementById("quizTitle");
    let message = document.getElementById("titleMessage");

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

    let displayTitle = document.getElementById("displayQuizTitle");

    if (displayTitle) {
        displayTitle.innerText = title;
    }
}


/* ==============================
   20. CLEAR QUESTIONS
============================== */

function clearQuestions() {
    // This clears the current browser's display only.
    // It does NOT delete shared questions from MongoDB.

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
            "Local question display cleared. Shared database questions remain.";
    }

    if (fileNameElement) {
        fileNameElement.innerText = "No file imported yet";
    }

    showCorrectScreen();
}


/* ==============================
   21. KEYBOARD RESTRICTIONS
============================== */

// Ctrl + Q returns to the start screen.
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


// These browser restrictions are not a replacement for secure exam software.
document.addEventListener("keydown", function (event) {
    if (!quizStarted) {
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
    }
});


/* ==============================
   22. DISABLE RIGHT-CLICK
============================== */

document.addEventListener("contextmenu", function (event) {
    if (quizStarted) {
        event.preventDefault();
    }
});

function cancelTest() {
    showConfirm(
        "Are you sure you want to Cancel Test in Server.",
        function () {
            localStorage.removeItem("quizProgress");

            score = 0;
            questionIndex = 0;
            userAnswers = [];
            selectedAnswers = [];
            quizStarted = false;
            studentName = "";

            if (document.fullscreenElement) {
                document.exitFullscreen().catch(function () {});
            }

            document.getElementById("quizScreen").style.display = "none";
            document.getElementById("resultScreen").style.display = "none";
            document.getElementById("passwordScreen").style.display = "none";
            document.getElementById("startScreen").style.display = "block";

            let cancelBtn = document.getElementById("cancelBtn");
            if (cancelBtn) cancelBtn.style.display = "none";

            showMessage("Test cancelled in Server");
        }
    );
}


let confirmAction = null;

function showConfirm(message, action) {
    document.getElementById("confirmMessage").innerText = message;
    document.getElementById("confirmBox").style.display = "block";
    confirmAction = action;
}

function confirmYes() {
    document.getElementById("confirmBox").style.display = "none";

    if (confirmAction) {
        confirmAction();
    }

    confirmAction = null;
}

function confirmNo() {
    document.getElementById("confirmBox").style.display = "none";
    confirmAction = null;
}