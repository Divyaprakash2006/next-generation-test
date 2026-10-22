
/* =========================================
   1. IMPORT PACKAGES AND CONFIGURATION
========================================= */

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json({ limit: "2mb" }));

// Serve frontend files from the public folder.
app.use(express.static(__dirname));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "import.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "quiz.html"));
});
/* =========================================
   2. QUESTION MODEL
========================================= */

const optionSchema = new mongoose.Schema(
    {
        letter: {
            type: String,
            required: true,
            trim: true
        },

        text: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },

    options: {
        type: [optionSchema],
        required: true
    },

    answer: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    }
});

const Question = mongoose.model("Question", questionSchema);


/* =========================================
   3. QUIZ RESULT MODEL
========================================= */

const resultSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },

    total: {
        type: Number,
        required: true
    },

    percentage: {
        type: Number,
        required: true
    },

    feedback: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Result = mongoose.model("Result", resultSchema);


/* =========================================
   4. ADMIN PASSWORD CHECK
========================================= */

function checkAdmin(req, res, next) {
    const password = req.get("x-admin-password");

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({
            success: false,
            message: "ADMIN_PASSWORD is missing from .env."
        });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin password. Please log in again."
        });
    }

    next();
}


/* =========================================
   5. ADMIN LOGIN API
========================================= */

app.post("/api/admin/login", function (req, res) {
    try {
        const password = req.body?.password;

        if (!process.env.ADMIN_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: "ADMIN_PASSWORD is missing from .env."
            });
        }

        if (
            typeof password !== "string" ||
            password !== process.env.ADMIN_PASSWORD
        ) {
            return res.status(401).json({
                success: false,
                message: "Incorrect admin password."
            });
        }

        return res.json({
            success: true,
            message: "Admin login successful."
        });

    } catch (error) {
        console.error("Admin login error:", error);

        return res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});


/* =========================================
   6. UPLOAD QUESTIONS TO MONGODB
========================================= */

app.post("/api/admin/questions", checkAdmin, async function (req, res) {
    try {
        const questions = req.body?.questions;

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid question list."
            });
        }

        const cleanQuestions = [];

        // Validate all questions before changing the database.
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            if (
                !q ||
                typeof q.question !== "string" ||
                !q.question.trim() ||
                !Array.isArray(q.options) ||
                q.options.length < 2 ||
                typeof q.answer !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Question " + (i + 1) + " has invalid data."
                });
            }

            const options = [];
            const usedLetters = new Set();

            for (const option of q.options) {
                if (
                    !option ||
                    typeof option.letter !== "string" ||
                    typeof option.text !== "string"
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "An option in question " + (i + 1) + " is invalid."
                    });
                }

                const letter = option.letter.trim().toUpperCase();
                const text = option.text.trim();

                if (!/^[A-Z]$/.test(letter) || !text) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid option in question " + (i + 1) + "."
                    });
                }

                if (usedLetters.has(letter)) {
                    return res.status(400).json({
                        success: false,
                        message: "Duplicate option letter in question " + (i + 1) + "."
                    });
                }

                usedLetters.add(letter);

                options.push({
                    letter: letter,
                    text: text
                });
            }

            const answer = q.answer.trim().toUpperCase();

            if (!usedLetters.has(answer)) {
                return res.status(400).json({
                    success: false,
                    message: "Correct answer is invalid in question " + (i + 1) + "."
                });
            }

            cleanQuestions.push({
                question: q.question.trim(),
                options: options,
                answer: answer
            });
        }

        // Replace the old question set only after validation succeeds.
        await Question.deleteMany({});
        await Question.insertMany(cleanQuestions);

        return res.json({
            success: true,
            message: cleanQuestions.length +
                " questions uploaded successfully.",
            total: cleanQuestions.length
        });

    } catch (error) {
        console.error("Question upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not upload questions. Check MongoDB and server logs."
        });
    }
});


/* =========================================
   7. GET QUESTIONS FOR QUIZ
========================================= */

app.get("/api/quiz/questions", async function (req, res) {
    try {
        const questions = await Question.find()
            .select("question options answer -_id")
            .lean();

        return res.json({
            success: true,
            questions: questions
        });

    } catch (error) {
        console.error("Question loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load questions."
        });
    }
});



app.delete("/api/admin/questions", checkAdmin, async (req, res) => {
    try {
        const result = await Question.deleteMany({});

        res.json({
            message: "All uploaded questions deleted successfully.",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete questions error:", error);

        res.status(500).json({
            message: "Failed to delete questions."
        });
    }
});


app.get("/api/admin/results", checkAdmin, async (req, res) => {
    try {
        const results = await Result.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json(results);

    } catch (error) {
        console.error("Fetch results error:", error);

        res.status(500).json({
            message: "Failed to fetch results."
        });
    }
});

// Delete all student results
app.delete("/api/admin/results", checkAdmin, async (req, res) => {

    try {
        const result = await Result.deleteMany({});

        res.json({
            message: "All student results deleted successfully.",
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error("Delete results error:", error);

        res.status(500).json({
            message: "Failed to delete student results."
        });
    }
});

/* =========================================
   8. SAVE QUIZ RESULT
========================================= */

app.post("/api/quiz/results", async (req, res) => {
    try {
        const studentName =
            String(req.body.studentName || "").trim();

        const score = Number(req.body.score);
        const total = Number(req.body.total);
        const percentage = Number(req.body.percentage);

        if (
            !studentName ||
            !Number.isFinite(score) ||
            !Number.isFinite(total) ||
            !Number.isFinite(percentage) ||
            total <= 0 ||
            score < 0 ||
            score > total
        ) {
            return res.status(400).json({
                message: "Invalid student result."
            });
        }

        const result = new Result({
            studentName: studentName,
            score: score,
            total: total,
            percentage: percentage,
            createdAt: new Date()
        });

        await result.save();

        res.status(201).json({
            message: "Student result saved successfully."
        });

    } catch (error) {
        console.error("Save result error:", error);

        res.status(500).json({
            message: "Failed to save result."
        });
    }
});


/* =========================================
   9. TEST API AND FRONTEND ROUTES
========================================= */

// Redirect the root URL to the import page.
app.get("/", function (req, res) {
    return res.redirect("/import.html");
});

// Simple endpoint to check if the server is responding.
app.get("/api/health", function (req, res) {
    return res.json({
        success: true,
        message: "Quiz server is running."
    });
});


/* =========================================
   10. HANDLE INVALID API ROUTES
========================================= */

app.use("/api", function (req, res) {
    return res.status(404).json({
        success: false,
        message: "API route not found: " + req.method + " " + req.originalUrl
    });
});


/* =========================================
   11. ERROR HANDLER
========================================= */

app.use(function (error, req, res, next) {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});


/* =========================================
   12. CONNECT MONGODB AND START SERVER
========================================= */

async function startServer() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from .env");
        }

        if (!process.env.ADMIN_PASSWORD) {
            throw new Error("ADMIN_PASSWORD is missing from .env");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully.");

        const PORT = process.env.PORT || 3001;

        app.listen(PORT, function () {
            console.log("Server running at http://localhost:" + PORT);
            console.log("Import page: http://localhost:" + PORT + "/import.html");
        });

    } catch (error) {
        console.error("Server startup error:", error.message);
        process.exit(1);
    }
}

startServer();
