
/* =========================================
   1. IMPORT PACKAGES AND CONFIGURATION
========================================= */

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

app.get("/", function (req, res) {
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
    },

    imageUrl: {
        type: String,
        default: ""
    }
});

const Question = mongoose.model("Question", questionSchema);


/* =========================================
   3. STUDENT MODEL
========================================= */

const studentSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },

    password: {
        type: String,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Student = mongoose.model("Student", studentSchema);


/* =========================================
   4. QUIZ RESULT MODEL
========================================= */

const resultSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        required: true
    },

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
   5. SETTINGS MODEL
========================================= */

const settingSchema = new mongoose.Schema({
    reviewEnabled: {
        type: Boolean,
        default: false
    }
});

const Setting = mongoose.model("Setting", settingSchema);


/* =========================================
   6. ADMIN AUTHENTICATION
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
   7. STUDENT AUTHENTICATION
========================================= */

function checkStudent(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.student = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Student session expired. Please log in again."
        });
    }
}


/* =========================================
   CLOUDINARY CONFIGURATION
========================================= */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("Cloudinary Configuration:");
console.log("Cloud Name:", cloudinary.config().cloud_name);
console.log("API Key Loaded:", Boolean(cloudinary.config().api_key));
console.log("API Secret Loaded:", Boolean(cloudinary.config().api_secret));

if (
    !cloudinary.config().cloud_name ||
    !cloudinary.config().api_key ||
    !cloudinary.config().api_secret
) {
    console.log("ERROR: Cloudinary credentials are missing.");
}

/* =========================================
   CLOUDINARY IMAGE UPLOAD FUNCTION
========================================= */

function uploadImageToCloudinary(buffer) {
    return new Promise(function (resolve, reject) {

        cloudinary.uploader.upload_stream(
            {
                folder: "quiz-question-images",
                resource_type: "image"
            },
            function (error, result) {

                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }

            }
        ).end(buffer);

    });
}



const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
        }
    }
});
app.post(
    "/api/admin/upload-image",
    checkAdmin,
    function (req, res, next) {

        imageUpload.single("image")(req, res, async function (error) {

            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            try {

                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        message: "Please paste an image."
                    });
                }

                const result = await uploadImageToCloudinary(
                    req.file.buffer
                );

                res.json({
                    success: true,
                    imageUrl: result.secure_url
                });

            } catch (error) {
    console.log("\n========== CLOUDINARY DEBUG ==========");
    console.dir(error, { depth: 10 });
    console.log("HTTP Status:", error.http_code);
    console.log("Response:", error.response);
    console.log("======================================");

    res.status(500).json({
        success: false,
        message: error.message,
        status: error.http_code || null
    });
}

        });

    }
);
/* =========================================
   8. ADMIN LOGIN API
========================================= */

app.post("/api/admin/login", function (req, res) {
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

    res.json({
        success: true,
        message: "Admin login successful."
    });
});


/* =========================================
   9. STUDENT LOGIN API
========================================= */

app.post("/api/student/login", async function (req, res) {
    try {
        const rollNumber = String(
            req.body?.rollNumber || ""
        ).trim().toUpperCase();

        const password = req.body?.password;

        if (!rollNumber || typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Enter your roll number and password."
            });
        }

        const student = await Student.findOne({
            rollNumber: rollNumber
        });

        if (!student || !student.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid roll number or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            student.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid roll number or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT_SECRET is missing from .env."
            });
        }

        const token = jwt.sign(
            {
                studentId: student._id.toString(),
                rollNumber: student.rollNumber
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            success: true,
            message: "Login successful.",
            token: token,
            rollNumber: student.rollNumber
        });

    } catch (error) {
        console.error("Student login error:", error);

        res.status(500).json({
            success: false,
            message: "Student login failed."
        });
    }
});


/* =========================================
   10. ADMIN: ADD ONE STUDENT
========================================= */

app.post("/api/admin/students", checkAdmin, async function (req, res) {
    try {
        const rollNumber = String(
            req.body?.rollNumber || ""
        ).trim().toUpperCase();

        const password = req.body?.password;

        if (
            !rollNumber ||
            typeof password !== "string" ||
            password.length < 4
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a roll number and password with at least 4 characters."
            });
        }

        const existingStudent = await Student.findOne({
            rollNumber: rollNumber
        });

        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: "This roll number already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await Student.create({
            rollNumber: rollNumber,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "Student added successfully."
        });

    } catch (error) {
        console.error("Add student error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to add student."
        });
    }
});


/* =========================================
   11. ADMIN: IMPORT MULTIPLE STUDENTS
========================================= */

app.post("/api/admin/import-students", checkAdmin, async function (req, res) {
    try {
        const students = req.body?.students;

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No student records received."
            });
        }

        if (students.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Import a maximum of 1000 students at a time."
            });
        }

        const seenRollNumbers = new Set();
        const cleanStudents = [];

        for (let i = 0; i < students.length; i++) {
            const rollNumber = String(
                students[i]?.rollNumber || ""
            ).trim().toUpperCase();

            const password = students[i]?.password;

            if (
                !rollNumber ||
                typeof password !== "string" ||
                password.length < 4
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid student details in row " + (i + 1) +
                        ". Password must contain at least 4 characters."
                });
            }

            if (seenRollNumbers.has(rollNumber)) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate roll number: " + rollNumber
                });
            }

            seenRollNumbers.add(rollNumber);

            cleanStudents.push({
                rollNumber: rollNumber,
                password: password
            });
        }

        let added = 0;
        let skipped = 0;

        for (const student of cleanStudents) {
            const existing = await Student.findOne({
                rollNumber: student.rollNumber
            });

            if (existing) {
                skipped++;
                continue;
            }

            const hashedPassword = await bcrypt.hash(
                student.password,
                10
            );

            await Student.create({
                rollNumber: student.rollNumber,
                password: hashedPassword
            });

            added++;
        }

        res.json({
            success: true,
            added: added,
            skipped: skipped,
            message: added + " students added. " +
                skipped + " existing roll numbers skipped."
        });

    } catch (error) {
        console.error("Student import error:", error);

        res.status(500).json({
            success: false,
            message: "Student import failed."
        });
    }
});


/* =========================================
   12. ADMIN: GET STUDENTS
========================================= */

app.get("/api/admin/students", checkAdmin, async function (req, res) {
    try {
        const students = await Student.find()
            .select("rollNumber isActive createdAt")
            .sort({ rollNumber: 1 })
            .lean();

        res.json({
            success: true,
            students: students
        });

    } catch (error) {
        console.error("Fetch students error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch students."
        });
    }
});


/* =========================================
   13. ADMIN: DELETE STUDENT
========================================= */

app.delete("/api/admin/students/:id", checkAdmin, async function (req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const student = await Student.findByIdAndDelete(
            req.params.id
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        res.json({
            success: true,
            message: "Student deleted successfully."
        });

    } catch (error) {
        console.error("Delete student error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete student."
        });
    }
});


/* =========================================
   14. ADMIN: UPLOAD QUESTIONS
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
                        message: "Invalid option in question " + (i + 1) + "."
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

            const imageUrl = typeof q.imageUrl === "string"
                ? q.imageUrl.trim()
                : "";

            cleanQuestions.push({
                question: q.question.trim(),
                options: options,
                answer: answer,
                imageUrl: imageUrl
            });
        }

        await Question.deleteMany({});
        await Question.insertMany(cleanQuestions);

        res.json({
            success: true,
            message: cleanQuestions.length + " questions uploaded successfully.",
            total: cleanQuestions.length
        });

    } catch (error) {
        console.error("Question upload error:", error);

        res.status(500).json({
            success: false,
            message: "Could not upload questions."
        });
    }
});


/* =========================================
   15. STUDENT: GET QUESTIONS
   Correct answers are NOT sent to students.
========================================= */

app.get("/api/quiz/questions", async function (req, res) {
    try {
        const questions = await Question.find()
            .select("question options imageUrl")
            .lean();

        res.json({
            success: true,
            questions: questions
        });

    } catch (error) {
        console.error("Question loading error:", error);

        res.status(500).json({
            success: false,
            message: "Could not load questions."
        });
    }
});



/* =========================================
   STUDENT: GET ANSWER REVIEW
========================================= */

app.get(
    "/api/quiz/results/:id/review",
    checkStudent,
    async function (req, res) {
        try {

            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid result ID."
                });
            }

            const setting = await Setting.findOne();

            if (!setting || !setting.reviewEnabled) {
                return res.status(403).json({
                    success: false,
                    message: "Answer review is disabled."
                });
            }

            const result = await Result.findOne({
                _id: req.params.id,
                rollNumber: req.student.rollNumber
            }).lean();

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "Result not found."
                });
            }

            return res.json({
                success: true,
                feedback: result.feedback
            });

        } catch (error) {

            console.error("Answer review error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load answer review."
            });

        }
    }
);


/* =========================================
   16. ADMIN: DELETE ALL QUESTIONS
========================================= */

app.delete("/api/admin/questions", checkAdmin, async function (req, res) {
    try {
        const result = await Question.deleteMany({});

        res.json({
            success: true,
            message: "All questions deleted successfully.",
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error("Delete questions error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete questions."
        });
    }
});


/* =========================================
   17. STUDENT: SUBMIT QUIZ
   Server calculates the score.
========================================= */

app.post("/api/quiz/results", checkStudent, async function (req, res) {
    try {
        const answers = req.body?.answers;

        if (!Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz answers."
            });
        }

        const questions = await Question.find().lean();

        if (questions.length === 0 || answers.length !== questions.length) {
            return res.status(400).json({
                success: false,
                message: "The submitted quiz does not match the current questions."
            });
        }

        const answerMap = new Map();

        for (const item of answers) {
            if (
                !item ||
                typeof item.questionId !== "string" ||
                !mongoose.isValidObjectId(item.questionId) ||
                typeof item.answer !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid answer data."
                });
            }

            if (answerMap.has(item.questionId)) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate answer submitted."
                });
            }

            answerMap.set(
                item.questionId,
                item.answer.trim().toUpperCase()
            );
        }

        let score = 0;
        const feedback = [];

        for (const question of questions) {
            const questionId = question._id.toString();

            if (!answerMap.has(questionId)) {
                return res.status(400).json({
                    success: false,
                    message: "Please answer every question before submitting."
                });
            }

            const selectedAnswer = answerMap.get(questionId);
            const isCorrect = selectedAnswer === question.answer;

            if (isCorrect) {
                score++;
            }

            feedback.push({
                question: question.question,
                options: question.options,
                selectedAnswer: selectedAnswer,
                correctAnswer: question.answer,
                isCorrect: isCorrect,
                imageUrl: question.imageUrl || ""
            });
        }

        const total = questions.length;
        const percentage = Number(
            ((score / total) * 100).toFixed(2)
        );

        const rollNumber = req.student.rollNumber;

        const result = await Result.create({
            rollNumber: rollNumber,
            studentName: rollNumber,
            score: score,
            total: total,
            percentage: percentage,
            feedback: feedback
        });

        res.status(201).json({
            success: true,
            message: "Quiz result saved successfully.",
            resultId: result._id,
            rollNumber: rollNumber,
            score: score,
            total: total,
            percentage: percentage
        });

    } catch (error) {
        console.error("Submit result error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to submit quiz result."
        });
    }
});


/* =========================================
   18. ADMIN: GET STUDENT RESULTS
========================================= */

app.get("/api/admin/results", checkAdmin, async function (req, res) {
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


/* =========================================
   19. ADMIN: DELETE ALL RESULTS
========================================= */

app.delete("/api/admin/results", checkAdmin, async function (req, res) {
    try {
        const result = await Result.deleteMany({});

        res.json({
            success: true,
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
   20. ADMIN: GET REVIEW SETTING
========================================= */

app.get("/api/admin/review-setting", checkAdmin, async function (req, res) {
    try {
        let setting = await Setting.findOne();

        if (!setting) {
            setting = await Setting.create({
                reviewEnabled: false
            });
        }

        res.json({
            success: true,
            reviewEnabled: setting.reviewEnabled
        });

    } catch (error) {
        console.error("Get review setting error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to get review setting."
        });
    }
});


/* =========================================
   21. ADMIN: UPDATE REVIEW SETTING
========================================= */

app.post("/api/admin/review-setting", checkAdmin, async function (req, res) {
    try {
        let setting = await Setting.findOne();

        if (!setting) {
            setting = new Setting();
        }

        setting.reviewEnabled = req.body.reviewEnabled === true;

        await setting.save();

        res.json({
            success: true,
            reviewEnabled: setting.reviewEnabled,
            message: setting.reviewEnabled
                ? "Student review enabled successfully."
                : "Student review disabled successfully."
        });

    } catch (error) {
        console.error("Update review setting error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update review setting."
        });
    }
});


/* =========================================
   22. STUDENT: CHECK REVIEW PERMISSION
========================================= */

app.get("/api/quiz/review-setting", async function (req, res) {
    try {
        const setting = await Setting.findOne();

        res.json({
            success: true,
            reviewEnabled: setting
                ? setting.reviewEnabled
                : false
        });

    } catch (error) {
        console.error("Student review setting error:", error);

        res.status(500).json({
            success: false,
            reviewEnabled: false
        });
    }
});


/* =========================================
   23. HEALTH CHECK
========================================= */

app.get("/api/health", function (req, res) {
    res.json({
        success: true,
        message: "Quiz server is running."
    });
});


/* =========================================
   24. INVALID API ROUTES
========================================= */

app.use("/api", function (req, res) {
    res.status(404).json({
        success: false,
        message: "API route not found: " +
            req.method + " " + req.originalUrl
    });
});


/* =========================================
   25. ERROR HANDLER
========================================= */

app.use(function (error, req, res, next) {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});


/* =========================================
   26. CONNECT MONGODB AND START SERVER
========================================= */

async function startServer() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from .env");
        }

        if (!process.env.ADMIN_PASSWORD) {
            throw new Error("ADMIN_PASSWORD is missing from .env");
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully.");

        const PORT = process.env.PORT || 3001;

        app.listen(PORT, function () {
            console.log("Server running at http://localhost:" + PORT);
            console.log("Quiz page: http://localhost:" + PORT);
            console.log("Admin page: http://localhost:" + PORT + "/import.html");
        });

    } catch (error) {
        console.error("Server startup error:", error.message);
        process.exit(1);
    }
}

startServer();
