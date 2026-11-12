import "./App.css";
import { useAdminDashboard } from "./super_Server.js";

function Message({ messages, name }) {
    const item = messages[name];
    if (!item) return null;

    return (
        <p className={`message ${item.isError ? "error" : ""}`} role="status">
            {item.text}
        </p>
    );
}

function App() {
    const admin = useAdminDashboard();

    if (!admin.loggedIn) {
        return (
            <div className="admin-page">
                <header className="admin-header">
                    <a href="/" className="logo-link">
                        <img src="logo.svg" alt="Quiz Logo" className="logo" />
                    </a>
                    <a href="/" className="student-link">Student Portal</a>
                </header>

                <main className="admin-container">
                    <form className="admin-login-card" onSubmit={admin.handleAdminLogin}>
                        <h2>Admin Login</h2>
                        <p>Enter your admin password to continue.</p>

                        <input
                            type="password"
                            value={admin.loginPassword}
                            onChange={event => admin.setLoginPassword(event.target.value)}
                            placeholder="Enter admin password"
                            autoComplete="current-password"
                        />

                        <button type="submit" disabled={admin.loading?.login}>
                            {admin.loading?.login ? "Checking..." : "Login"}
                        </button>

                        <Message messages={admin.messages} name="admin" />
                    </form>
                </main>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-header">
                <a href="/" className="logo-link">
                    <img src="/logo.svg" alt="Quiz Logo" className="logo" />
                </a>
                <a href="/" className="student-link">Student Quiz</a>
            </header>

            <main className="admin-container">
                <div className="admin-title-row">
                    <div>
                        <h2>Welcome Admin</h2>
                        <p>Manage your quiz and students.</p>
                    </div>

                    <button className="logout-button" onClick={admin.handleLogout}>
                        Logout
                    </button>
                </div>

                <Message messages={admin.messages} name="dashboard" />

                {/* QUIZ TITLE SETTINGS */}
                <section className="import-card">
                    <h3>Quiz Title Settings</h3>

                    <input
                        type="text"
                        value={admin.quizTitle}
                        onChange={event => admin.setQuizTitle(event.target.value)}
                        placeholder="Enter quiz title"
                    />

                    <button onClick={admin.saveQuizTitle}>
                        Save Quiz Title
                    </button>

                    <Message messages={admin.messages} name="title" />
                </section>

                {/* IMPORT QUESTIONS FROM TXT */}
                <section className="import-card">
                    <h3>Import Questions from TXT File</h3>
                    <p>Select a text file containing your quiz questions.</p>

                    <input
                        type="file"
                        accept=".txt,text/plain"
                        onChange={event =>
                            admin.setQuestionFile(event.target.files?.[0] || null)
                        }
                    />

                    {admin.questionFile && (
                        <p>Selected file: {admin.questionFile.name}</p>
                    )}

                    <button
                        onClick={admin.handleTXTImport}
                        disabled={admin.loading.txt}
                    >
                        {admin.loading.txt ? "Importing..." : "Import Questions"}
                    </button>

                    <Message messages={admin.messages} name="txt" />
                </section>

                {/* MANUAL QUESTION IMPORT */}
                <section className="import-card">
                    <h3>Manually Add Questions</h3>
                    <p>Paste your questions using the supported format.</p>

                    <textarea
                        rows="12"
                        value={admin.typedQuestions}
                        onChange={event =>
                            admin.setTypedQuestions(event.target.value)
                        }
                        onPaste={admin.handleQuestionPaste}
                        placeholder={
                            "1. What is HTML?\n\n" +
                            "A. Programming language\n" +
                            "B. Markup language\n" +
                            "C. Database\n" +
                            "D. Operating system\n\n" +
                            "ANSWER: B"
                        }
                    />

                    <p className="helper-text">
                        Tip: Paste an image directly into this text area.
                        It will be uploaded and an IMAGE URL will be inserted.
                    </p>

                    {admin.imagePasteMessage && (
                        <p className="message">
                            {admin.imagePasteMessage}
                        </p>
                    )}

                    <button
                        onClick={admin.handleTypedImport}
                        disabled={admin.loading.typed}
                    >
                        {admin.loading.typed
                            ? "Importing..."
                            : "Import Typed Questions"}
                    </button>

                    <Message messages={admin.messages} name="typed" />
                </section>

                {/* QUESTION MANAGEMENT */}
                <section className="import-card">
                    <h3>Question Management</h3>

                    <p>
                        Total Questions: <strong>{admin.questionCount}</strong>
                    </p>

                    <button
                        className="danger-button"
                        onClick={admin.handleDeleteAllQuestions}
                        disabled={admin.loading.deleteQuestions}
                    >
                        {admin.loading.deleteQuestions
                            ? "Deleting..."
                            : "Delete All Questions"}
                    </button>

                    <Message messages={admin.messages} name="questions" />
                </section>

                {/* ADD STUDENT */}
                <section className="import-card">
                    <h3>Add Student Manually</h3>
                    <p>Register one student using their roll number and password.</p>

                    <form onSubmit={admin.handleAddStudent}>
                        <input
                            type="text"
                            name="rollNumber"
                            placeholder="Enter student roll number"
                        />

                        <input
                            type="password"
                            name="studentPassword"
                            placeholder="Enter student password"
                        />

                        <button
                            type="submit"
                            disabled={admin.loading.addStudent}
                        >
                            {admin.loading.addStudent
                                ? "Adding..."
                                : "Add Student"}
                        </button>
                    </form>

                    <Message messages={admin.messages} name="addStudent" />
                </section>

                {/* IMPORT STUDENTS FROM CSV */}
                <section className="import-card">
                    <h3>Import Students from CSV</h3>

                    <p>
                        Upload a CSV file containing student roll numbers and passwords.
                    </p>

                    <p>
                        Required CSV columns: <strong>Roll Number</strong> and{" "}
                        <strong>Password</strong>.
                    </p>

                    <button
                        type="button"
                        onClick={admin.downloadStudentCSVTemplate}
                    >
                        Download CSV Template
                    </button>

                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={event =>
                            admin.setStudentCSVFile(event.target.files?.[0] || null)
                        }
                    />

                    {admin.studentCSVFile && (
                        <p>Selected file: {admin.studentCSVFile.name}</p>
                    )}

                    <button
                        onClick={admin.handleCSVImport}
                        disabled={admin.loading.csv}
                    >
                        {admin.loading.csv
                            ? "Importing..."
                            : "Import Students"}
                    </button>

                    <Message messages={admin.messages} name="csv" />
                </section>

                {/* REGISTERED STUDENTS */}
                <section className="import-card">
                    <div className="section-heading">
                        <h3>Registered Students</h3>

                        <button
                            onClick={admin.refreshStudents}
                            disabled={admin.loading.students}
                        >
                            {admin.loading.students
                                ? "Loading..."
                                : "Refresh Students"}
                        </button>
                    </div>

                    <p>Total Students: {admin.students.length}</p>

                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Roll Number</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {admin.students.length === 0 ? (
                                    <tr>
                                        <td colSpan="4">
                                            No students registered.
                                        </td>
                                    </tr>
                                ) : (
                                    admin.students.map((student, index) => (
                                        <tr key={student._id}>
                                            <td>{index + 1}</td>
                                            <td>{student.rollNumber}</td>
                                            <td>
                                                {student.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </td>
                                            <td>
                                                <button
                                                    className="danger-button"
                                                    onClick={() =>
                                                        admin.handleDeleteStudent(student)
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Message messages={admin.messages} name="students" />
                </section>

                {/* STUDENT ANSWER REVIEW */}
                <section className="import-card">
                    <h3>Student Answer Review Permission</h3>

                    <p>
                        Allow students to view their correct answers after completing the quiz.
                    </p>

                    <p>
                        Current Status:{" "}
                        <strong
                            className={
                                admin.reviewEnabled
                                    ? "status-enabled"
                                    : "status-disabled"
                            }
                        >
                            {admin.reviewEnabled ? "Enabled" : "Disabled"}
                        </strong>
                    </p>

                    <button
                        onClick={admin.handleToggleReview}
                        disabled={admin.loading.review}
                    >
                        {admin.loading.review
                            ? "Updating..."
                            : admin.reviewEnabled
                                ? "Disable Student Review"
                                : "Enable Student Review"}
                    </button>

                    <Message messages={admin.messages} name="review" />
                </section>

                {/* STUDENT RESULTS */}
                <section className="import-card">
                    <div className="section-heading">
                        <h3>Student Quiz Results</h3>

                        <button
                            onClick={admin.refreshResults}
                            disabled={admin.loading.results}
                        >
                            {admin.loading.results
                                ? "Loading..."
                                : "Refresh Results"}
                        </button>
                    </div>

                    <button
                        className="danger-button"
                        onClick={admin.handleDeleteAllResults}
                        disabled={admin.loading.deleteResults}
                    >
                        {admin.loading.deleteResults
                            ? "Deleting..."
                            : "Delete All Results"}
                    </button>

                    <div className="table-container">
                        <table className="admin-table">
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

                            <tbody>
                                {admin.results.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            No student results available.
                                        </td>
                                    </tr>
                                ) : (
                                    admin.results.map((result, index) => (
                                        <tr key={result._id || index}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {result.rollNumber || result.studentName}
                                            </td>
                                            <td>{result.score}</td>
                                            <td>{result.total}</td>
                                            <td>{result.percentage}%</td>
                                            <td>
                                                {result.createdAt
                                                    ? new Date(
                                                        result.createdAt
                                                    ).toLocaleString()
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Message messages={admin.messages} name="results" />
                </section>
            </main>

            {/* CONFIRMATION MODAL */}
            {admin.confirmOpen && (
                <div className="confirm-box" role="presentation">
                    <div
                        className="confirm-content"
                        role="dialog"
                        aria-modal="true"
                    >
                        <h3>Confirmation</h3>

                        <p>{admin.confirmMessage}</p>

                        <div className="confirm-buttons">
                            <button onClick={admin.confirmYes}>
                                Yes
                            </button>

                            <button
                                className="secondary-button"
                                onClick={admin.confirmNo}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;