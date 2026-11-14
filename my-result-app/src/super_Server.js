
import { useState, useEffect } from "react";

const API_URL = "";

// ============================================
// 1. PARSE AIKEN QUESTION TEXT
// ============================================


function parseQuestionText(text) {

    if (!text || !text.trim()) {
        throw new Error("Question text is empty.");
    }

    const lines = text.replace(/\r/g, "").split("\n");

    const questionStartRegex =
        /^\s*(?:(?:question|q)\s*)?\d+\s*[.):\-]\s*(.*)$/i;

    const optionRegex =
        /^\s*(?:\(([A-Z])\)|\[([A-Z])\]|([A-Z]))\s*[.):\-]?\s+(.+?)\s*$/i;

    const answerRegex =
        /^\s*(?:CORRECT\s+ANSWER|ANSWER|ANS|KEY)\s*[:=\-]\s*(?:OPTION\s*)?([A-Z])\s*$/i;

    const imageRegex =
        /^\s*(?:IMAGE|IMAGE URL)\s*[:=\-]\s*(.+)$/i;

    // =====================================
    // 1. SPLIT QUESTIONS INTO BLOCKS
    // =====================================

    const blocks = [];

    let currentBlock = [];

    const numberedFormat = lines.some(line =>
        questionStartRegex.test(line)
    );

    for (const line of lines) {

        const trimmed = line.trim();

        if (!trimmed) {

            if (
                !numberedFormat &&
                currentBlock.some(value => answerRegex.test(value))
            ) {

                if (currentBlock.length > 0) {
                    blocks.push(currentBlock);
                    currentBlock = [];
                }
            }

            continue;
        }

        if (numberedFormat && questionStartRegex.test(line)) {

            if (currentBlock.length > 0) {
                blocks.push(currentBlock);
            }

            currentBlock = [line];

        } else {

            currentBlock.push(line);

        }

        // Unnumbered AIKEN: finish after ANSWER.
        if (
            !numberedFormat &&
            answerRegex.test(trimmed)
        ) {

            blocks.push(currentBlock);
            currentBlock = [];

        }
    }

    if (currentBlock.length > 0) {
        blocks.push(currentBlock);
    }

    if (blocks.length === 0) {
        throw new Error("No questions found.");
    }


    // =====================================
    // 2. PARSE EACH QUESTION
    // =====================================

    const questions = [];

    for (let i = 0; i < blocks.length; i++) {

        const block = blocks[i];

        let question = "";

        let options = [];

        let answer = "";

        let imageUrl = "";

        let optionsStarted = false;

        // Check if first line has question number.
        let startIndex = 0;

        const firstLine = block[0].trim();

        const questionMatch = firstLine.match(questionStartRegex);

        if (questionMatch) {

            question = questionMatch[1].trim();

            startIndex = 1;

        }


        for (let j = startIndex; j < block.length; j++) {

            const line = block[j].trim();

            if (!line) continue;


            // =================================
            // IMAGE
            // =================================

            const imageMatch = line.match(imageRegex);

            if (imageMatch) {

                imageUrl = imageMatch[1].trim();

                continue;
            }


            // =================================
            // ANSWER
            // =================================

            const answerMatch = line.match(answerRegex);

            if (answerMatch) {

                if (answer) {
                    throw new Error(
                        "Multiple answer declarations in question " +
                        (i + 1) + "."
                    );
                }

                answer = answerMatch[1].toUpperCase();

                continue;
            }


            // =================================
            // OPTIONS
            // =================================

            const optionMatch = line.match(optionRegex);

            if (optionMatch) {

                optionsStarted = true;

                const letter = (
                    optionMatch[1] ||
                    optionMatch[2] ||
                    optionMatch[3]
                ).toUpperCase();

                const optionText = optionMatch[4].trim();

                // Duplicate letter validation.
                const duplicate = options.some(option =>
                    option.letter === letter
                );

                if (duplicate) {

                    throw new Error(
                        "Duplicate option letter '" +
                        letter +
                        "' in question " +
                        (i + 1) +
                        ". Check your question file."
                    );

                }

                options.push({
                    letter: letter,
                    text: optionText
                });

                continue;
            }


            // =================================
            // QUESTION / OPTION CONTINUATION
            // =================================

            if (optionsStarted && options.length > 0) {

                // Continue previous option text.
                options[options.length - 1].text +=
                    " " + line;

            } else {

                // Continue question text.
                question +=
                    (question ? " " : "") + line;

            }

        }


        // =====================================
        // 3. VALIDATE QUESTION
        // =====================================

        if (!question.trim()) {

            throw new Error(
                "Question " + (i + 1) +
                " is missing question text."
            );

        }


        if (options.length < 2) {

            throw new Error(
                "Question " + (i + 1) +
                " must contain at least two options."
            );

        }


        if (!answer) {

            throw new Error(
                "Question " + (i + 1) +
                " is missing its correct answer."
            );

        }


        if (!options.some(option =>
            option.letter === answer
        )) {

            throw new Error(
                "Correct answer '" + answer +
                "' does not exist in question " +
                (i + 1) + "."
            );

        }


        // =====================================
        // 4. VALIDATE EMPTY OPTIONS
        // =====================================

        for (const option of options) {

            if (!option.text.trim()) {

                throw new Error(
                    "Option " + option.letter +
                    " is empty in question " +
                    (i + 1) + "."
                );

            }

        }


        // =====================================
        // 5. CREATE QUESTION OBJECT
        // =====================================

        const questionData = {
            question: question.trim(),
            options: options,
            answer: answer
        };

        if (imageUrl) {

            questionData.imageUrl = imageUrl;

        }

        questions.push(questionData);

    }


    // =====================================
    // 6. RETURN QUESTIONS
    // =====================================

    return questions;

}


// ============================================
// 2. ADMIN DASHBOARD HOOK
// ============================================

export function useAdminDashboard() {

    // ========================================
    // STATES
    // ========================================

    const [loggedIn, setLoggedIn] = useState(false);

    const [loginPassword, setLoginPassword] = useState("");

   

    const [questionFile, setQuestionFile] = useState(null);

    const [typedQuestions, setTypedQuestions] = useState("");

    const [studentCSVFile, setStudentCSVFile] = useState(null);

    const [students, setStudents] = useState([]);

    const [results, setResults] = useState([]);

    const [questionCount, setQuestionCount] = useState(0);

    const [reviewEnabled, setReviewEnabled] = useState(false);

    const [imagePasteMessage, setImagePasteMessage] = useState("");

    const [messages, setMessages] = useState({});
    const [quizTitle, setQuizTitle] = useState("Online Quiz");
    const [loading, setLoading] = useState({
        login: false,
        txt: false,
        typed: false,
        csv: false,
        students: false,
        results: false,
        review: false,
        addStudent: false,
        deleteQuestions: false,
        deleteResults: false,
        sendAllEmails: false,
        sendingResultId: null,
    });

    const [confirmOpen, setConfirmOpen] = useState(false);

    const [confirmMessage, setConfirmMessage] = useState("");

    const [confirmAction, setConfirmAction] = useState(null);


    // ========================================
    // 3. MESSAGE FUNCTION
    // ========================================

    function showMessage(name, text, isError = false) {

        setMessages(previous => ({
            ...previous,
            [name]: {
                text,
                isError
            }
        }));

    }


    // ========================================
    // 4. LOADING FUNCTION
    // ========================================

    function setLoadingValue(name, value) {

        setLoading(previous => ({
            ...previous,
            [name]: value
        }));

    }


    // ========================================
    // 5. API REQUEST FUNCTION
    // ========================================

    async function apiRequest(url, options = {}) {

        const password = sessionStorage.getItem("adminPassword");

        const headers = {
            ...(options.headers || {})
        };

        if (password) {
            headers["x-admin-password"] = password;
        }

        const response = await fetch(API_URL + url, {
            ...options,
            headers
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Request failed. Please try again."
            );

        }

        return data;
    }


    // ========================================
    // 6. ADMIN LOGIN
    // ========================================


async function handleAdminLogin(event) {

    event.preventDefault();

    if (!loginPassword.trim()) {
        showMessage("admin", "Enter admin password.", true);
        return;
    }

    setLoadingValue("login", true);

    try {

        const response = await fetch("/api/admin/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                password: loginPassword
            })
        });

        const data = await response.json();

        if (!response.ok || data.success !== true) {
            throw new Error(
                data.message || "Login failed."
            );
        }

        sessionStorage.setItem(
            "adminPassword",
            loginPassword
        );

        setLoggedIn(true);

        showMessage(
            "dashboard",
            data.message || "Admin login successful."
        );

    } catch (error) {

        sessionStorage.removeItem("adminPassword");

        setLoggedIn(false);

        showMessage(
            "admin",
            error.message,
            true
        );

    } finally {

        setLoadingValue("login", false);

    }
}


    // ========================================
    // 7. VERIFY EXISTING LOGIN
    // ========================================

    useEffect(() => {

        async function verifyLogin() {

            const savedPassword =
                sessionStorage.getItem("adminPassword");

            if (!savedPassword) return;

            try {

                // Verify the saved password against a protected route.
                await apiRequest("/api/admin/review-setting");

                setLoggedIn(true);

            } catch (error) {

                sessionStorage.removeItem("adminPassword");

                setLoggedIn(false);

            }
        }

        verifyLogin();

    }, []);


    // ========================================
    // 8. ADMIN LOGOUT
    // ========================================

    function handleLogout() {

        sessionStorage.removeItem("adminPassword");

        setLoggedIn(false);

        setLoginPassword("");

        setStudents([]);

        setResults([]);

        setQuestionCount(0);

        setReviewEnabled(false);

        setMessages({});

    }


    // ========================================
    // 9. LOAD DASHBOARD DATA
    // ========================================

    async function loadDashboardData() {

        await Promise.all([
            refreshStudents(),
            refreshResults(),
            refreshQuestionCount(),
            refreshReviewSetting(),
            fetchQuizTitle()
        ]);

    }


    useEffect(() => {

        if (loggedIn) {
            loadDashboardData();
        }

    }, [loggedIn]);


    // ========================================
    // 10. REFRESH STUDENTS
    // ========================================

    async function refreshStudents() {

        setLoadingValue("students", true);

        try {

            const data = await apiRequest(
                "/api/admin/students"
            );

            setStudents(
                Array.isArray(data)
                    ? data
                    : data.students || []
            );

        } catch (error) {

            showMessage(
                "students",
                error.message,
                true
            );

        } finally {

            setLoadingValue("students", false);

        }
    }


    // ========================================
    // 11. REFRESH RESULTS
    // ========================================

    async function refreshResults() {

        setLoadingValue("results", true);

        try {

            const data = await apiRequest(
                "/api/admin/results"
            );

            setResults(
                Array.isArray(data)
                    ? data
                    : data.results || []
            );

        } catch (error) {

            showMessage(
                "results",
                error.message,
                true
            );

        } finally {

            setLoadingValue("results", false);

        }
    }

    // ========================================
// SEND EMAIL TO ONE STUDENT
// ========================================

async function handleSendResultEmail(result) {

    openConfirm(
        "Send quiz result email to " +
        (result.rollNumber || result.studentName) + "?",

        async function () {

            setLoading(previous => ({
                ...previous,
                sendingResultId: result._id
            }));

            try {

                const data = await apiRequest(
                    "/api/admin/results/" + result._id + "/send-email",
                    {
                        method: "POST"
                    }
                );

                showMessage(
                    "results",
                    data.message || "Email sent successfully."
                );

                await refreshResults();

            } catch (error) {

                showMessage(
                    "results",
                    error.message,
                    true
                );

                await refreshResults();

            } finally {

                setLoading(previous => ({
                    ...previous,
                    sendingResultId: null
                }));

            }
        }
    );
}

// ========================================
// SEND EMAIL TO ALL STUDENTS
// ========================================

function handleSendAllResultEmails() {

    openConfirm(
        "Are you sure you want to send result emails to all eligible students?",

        async function () {

            setLoadingValue("sendAllEmails", true);

            try {

                const data = await apiRequest(
                    "/api/admin/results/send-all-emails",
                    {
                        method: "POST"
                    }
                );

                showMessage(
                    "results",
                    "Email process completed. Sent: " +
                    data.sent +
                    ", Failed: " +
                    data.failed +
                    ", Skipped: " +
                    data.skipped
                );

                await refreshResults();

            } catch (error) {

                showMessage(
                    "results",
                    error.message,
                    true
                );

            } finally {

                setLoadingValue("sendAllEmails", false);

            }
        }
    );
}


    // ========================================
    // 12. REFRESH QUESTION COUNT
    // ========================================

    async function refreshQuestionCount() {

        try {

            // Student questions route returns an array
            // without exposing correct answers.

            const data = await apiRequest(
                "/api/quiz/questions"
            );

            const questions = Array.isArray(data)
                ? data
                : data.questions || [];

            setQuestionCount(
                data.count !== undefined
                    ? data.count
                    : questions.length
            );

        } catch (error) {

            showMessage(
                "questions",
                error.message,
                true
            );

        }
    }


    // ========================================
    // 13. REFRESH REVIEW SETTING
    // ========================================

    async function refreshReviewSetting() {

        try {

            const data = await apiRequest(
                "/api/admin/review-setting"
            );

            setReviewEnabled(
                data.reviewEnabled === true
            );

        } catch (error) {

            showMessage(
                "review",
                error.message,
                true
            );

        }
    }


// ========================================
// 14. QUIZ TITLE SETTINGS
// ========================================

// Fetch saved quiz title from MongoDB

async function fetchQuizTitle() {

    try {

        const data = await apiRequest(
            "/api/admin/test-title"
        );

        setQuizTitle(
            data.testTitle || "Online Quiz"
        );

    } catch (error) {

        showMessage(
            "title",
            error.message,
            true
        );

    }

}


// Save quiz title to MongoDB

async function saveQuizTitle() {

    if (!quizTitle.trim()) {

        showMessage(
            "title",
            "Please enter a quiz title.",
            true
        );

        return;
    }

    try {

        const data = await apiRequest(
            "/api/admin/test-title",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    testTitle: quizTitle.trim()
                })
            }
        );

        setQuizTitle(
            data.testTitle || quizTitle.trim()
        );

        showMessage(
            "title",
            data.message || "Quiz title saved successfully."
        );

    } catch (error) {

        showMessage(
            "title",
            error.message,
            true
        );

    }

}

    // ========================================
    // 15. IMPORT QUESTIONS FROM TXT
    // ========================================

    async function handleTXTImport() {

        if (!questionFile) {

            showMessage(
                "txt",
                "Please select a TXT file.",
                true
            );

            return;
        }

        setLoadingValue("txt", true);

        try {

            const text = await questionFile.text();

            const questions = parseQuestionText(text);

            const data = await apiRequest(
                "/api/admin/questions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        questions
                    })
                }
            );

            showMessage(
                "txt",
                data.message ||
                questions.length + " questions imported successfully."
            );

            setQuestionFile(null);

            await refreshQuestionCount();

        } catch (error) {

            showMessage(
                "txt",
                error.message,
                true
            );

        } finally {

            setLoadingValue("txt", false);

        }
    }


    // ========================================
    // 16. MANUAL QUESTION IMPORT
    // ========================================

    async function handleTypedImport() {

        if (!typedQuestions.trim()) {

            showMessage(
                "typed",
                "Enter questions first.",
                true
            );

            return;
        }

        setLoadingValue("typed", true);

        try {

            const questions = parseQuestionText(
                typedQuestions
            );

            const data = await apiRequest(
                "/api/admin/questions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        questions
                    })
                }
            );

            showMessage(
                "typed",
                data.message ||
                questions.length + " questions imported successfully."
            );

            setTypedQuestions("");

            await refreshQuestionCount();

        } catch (error) {

            showMessage(
                "typed",
                error.message,
                true
            );

        } finally {

            setLoadingValue("typed", false);

        }
    }


    // ========================================
    // 17. PASTE IMAGE INTO QUESTION
    // ========================================

    async function handleQuestionPaste(event) {

        const items = event.clipboardData?.items;

        if (!items) return;

        for (const item of items) {

            if (item.type.indexOf("image") === 0) {

                event.preventDefault();

                const imageFile = item.getAsFile();

                if (!imageFile) return;

                setImagePasteMessage(
                    "Uploading image..."
                );

                try {

                    const formData = new FormData();

                    formData.append(
                        "image",
                        imageFile
                    );

                    const data = await apiRequest(
                        "/api/admin/upload-image",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                    const imageUrl =
                        data.imageUrl ||
                        data.url ||
                        data.secure_url;

                    if (!imageUrl) {

                        throw new Error(
                            "Image URL was not returned."
                        );

                    }

                    setTypedQuestions(previous => {

                        return previous +
                            "\nIMAGE: " +
                            imageUrl +
                            "\n";

                    });

                    setImagePasteMessage(
                        "Image uploaded successfully."
                    );

                } catch (error) {

                    setImagePasteMessage(
                        "Image upload failed: " +
                        error.message
                    );

                }

                break;
            }
        }
    }


    // ========================================
    // 18. DELETE ALL QUESTIONS
    // ========================================

    function handleDeleteAllQuestions() {

        openConfirm(
            "Are you sure you want to delete all questions?",

            async function () {

                setLoadingValue(
                    "deleteQuestions",
                    true
                );

                try {

                    const data = await apiRequest(
                        "/api/admin/questions",
                        {
                            method: "DELETE"
                        }
                    );

                    showMessage(
                        "questions",
                        data.message ||
                        "All questions deleted."
                    );

                    await refreshQuestionCount();

                } catch (error) {

                    showMessage(
                        "questions",
                        error.message,
                        true
                    );

                } finally {

                    setLoadingValue(
                        "deleteQuestions",
                        false
                    );

                }
            }
        );
    }


    // ========================================
    // 19. ADD STUDENT
    // ========================================

   
async function handleAddStudent(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const rollNumber = form.elements.rollNumber.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.studentPassword.value;

    if (!rollNumber || !email || !password) {
        showMessage(
            "addStudent",
            "Enter roll number, email and password.",
            true
        );
        return;
    }

    setLoadingValue("addStudent", true);

    try {
        const data = await apiRequest(
            "/api/admin/students",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    rollNumber,
                    email,
                    password
                })
            }
        );

        showMessage(
            "addStudent",
            data.message || "Student added successfully."
        );

        form.reset();

        await refreshStudents();

    } catch (error) {
        showMessage(
            "addStudent",
            error.message,
            true
        );
    } finally {
        setLoadingValue("addStudent", false);
    }
}


    // ========================================
    // 20. DOWNLOAD STUDENT CSV TEMPLATE
    // ========================================

    
function downloadStudentCSVTemplate() {
    const csv =
        "Roll Number,Email,Password\n" +
        "23CB001,student1@gmail.com,student123\n" +
        "23CB002,student2@gmail.com,student123\n";

    const blob = new Blob(
        [csv],
        { type: "text/csv" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "students-template.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


    // ========================================
    // 21. IMPORT STUDENTS CSV
    // ========================================

  
async function handleCSVImport() {
    if (!studentCSVFile) {
        showMessage("csv", "Please select a CSV file.", true);
        return;
    }

    setLoadingValue("csv", true);

    try {
        const csvText = await studentCSVFile.text();

        const lines = csvText.trim().split(/\r?\n/);

        if (lines.length < 2) {
            throw new Error("CSV file contains no student records.");
        }

        const headers = lines[0]
            .split(",")
            .map(value => value.trim().toLowerCase());

        const rollIndex = headers.findIndex(value =>
            value === "roll number" || value === "rollnumber"
        );

        const emailIndex = headers.findIndex(value =>
            value === "email" || value === "email address"
        );

        const passwordIndex = headers.findIndex(value =>
            value === "password"
        );

        if (
            rollIndex === -1 ||
            emailIndex === -1 ||
            passwordIndex === -1
        ) {
            throw new Error(
                "CSV must contain Roll Number, Email and Password columns."
            );
        }

        const studentsToImport = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(",");

            const rollNumber = values[rollIndex]?.trim();
            const email = values[emailIndex]?.trim().toLowerCase();
            const password = values[passwordIndex]?.trim();

            if (rollNumber && email && password) {
                studentsToImport.push({
                    rollNumber,
                    email,
                    password
                });
            }
        }

        if (studentsToImport.length === 0) {
            throw new Error("No valid student records found.");
        }

        const data = await apiRequest(
            "/api/admin/import-students",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    students: studentsToImport
                })
            }
        );

        showMessage(
            "csv",
            data.message || studentsToImport.length + " students imported."
        );

        setStudentCSVFile(null);

        await refreshStudents();

    } catch (error) {
        showMessage("csv", error.message, true);
    } finally {
        setLoadingValue("csv", false);
    }
}



    // ========================================
    // 22. DELETE SINGLE STUDENT
    // ========================================

    function handleDeleteStudent(student) {

        openConfirm(
            "Delete student " + student.rollNumber + "?",

            async function () {

                try {

                    const data = await apiRequest(
                        "/api/admin/students/" + student._id,
                        {
                            method: "DELETE"
                        }
                    );

                    showMessage(
                        "students",
                        data.message ||
                        "Student deleted successfully."
                    );

                    await refreshStudents();

                } catch (error) {

                    showMessage(
                        "students",
                        error.message,
                        true
                    );

                }
            }
        );
    }


    // ========================================
    // 23. ENABLE / DISABLE REVIEW
    // ========================================

    async function handleToggleReview() {

        setLoadingValue("review", true);

        try {

            const newStatus = !reviewEnabled;

            const data = await apiRequest(
                "/api/admin/review-setting",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        reviewEnabled: newStatus
                    })
                }
            );

            setReviewEnabled(
                data.reviewEnabled !== undefined
                    ? data.reviewEnabled
                    : newStatus
            );

            showMessage(
                "review",
                "Review setting updated successfully."
            );

        } catch (error) {

            showMessage(
                "review",
                error.message,
                true
            );

        } finally {

            setLoadingValue("review", false);

        }
    }


    // ========================================
    // 24. DELETE ALL RESULTS
    // ========================================

    function handleDeleteAllResults() {

        openConfirm(
            "Are you sure you want to delete all student results?",

            async function () {

                setLoadingValue(
                    "deleteResults",
                    true
                );

                try {

                    const data = await apiRequest(
                        "/api/admin/results",
                        {
                            method: "DELETE"
                        }
                    );

                    showMessage(
                        "results",
                        data.message ||
                        "All results deleted."
                    );

                    await refreshResults();

                } catch (error) {

                    showMessage(
                        "results",
                        error.message,
                        true
                    );

                } finally {

                    setLoadingValue(
                        "deleteResults",
                        false
                    );

                }
            }
        );
    }


    // ========================================
    // 25. CONFIRMATION MODAL
    // ========================================

    function openConfirm(message, action) {

        setConfirmMessage(message);

        setConfirmAction(() => action);

        setConfirmOpen(true);

    }


    function confirmYes() {

        setConfirmOpen(false);

        if (confirmAction) {
            confirmAction();
        }

        setConfirmAction(null);

    }


    function confirmNo() {

        setConfirmOpen(false);

        setConfirmAction(null);

    }


    // ========================================
    // 26. RETURN ALL STATES AND FUNCTIONS
    // ========================================

    return {

        loggedIn,

        loginPassword,
        setLoginPassword,

        quizTitle,
        setQuizTitle,

        questionFile,
        setQuestionFile,

        typedQuestions,
        setTypedQuestions,

        studentCSVFile,
        setStudentCSVFile,

        students,
        results,
        questionCount,

        reviewEnabled,

        imagePasteMessage,

        messages,
        loading,

        confirmOpen,
        confirmMessage,

        handleAdminLogin,
        handleLogout,

        saveQuizTitle,

        handleTXTImport,
        handleTypedImport,
        handleQuestionPaste,

        handleDeleteAllQuestions,

        handleAddStudent,
        downloadStudentCSVTemplate,
        handleCSVImport,

        refreshStudents,
        handleDeleteStudent,

        handleToggleReview,
        refreshResults,
        handleDeleteAllResults,


        handleSendResultEmail,
        handleSendAllResultEmails,
        
        confirmYes,
        confirmNo

    };

}
