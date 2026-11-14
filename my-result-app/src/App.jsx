
import { useState } from "react";
import "./App.css";
import { useAdminDashboard } from "./super_Server.js";

function Message({ messages, name }) {
    const item = messages[name];

    if (!item) return null;

    return (
        <p className={`message ${item.isError ? "error" : ""}`}>
            {item.text}
        </p>
    );
}

import {
    LayoutDashboard,
    Settings,
    FileUp,
    ClipboardList,
    Users,
    ShieldCheck,
    ChartColumn,
    LogOut,
    GraduationCap
} from "lucide-react";

function App() {
    const admin = useAdminDashboard();
    const [activePage, setActivePage] = useState("dashboard");

    const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "import", label: "Import Questions", icon: FileUp },
    { id: "questions", label: "Question Management", icon: ClipboardList },
    { id: "students", label: "Students", icon: Users },
    { id: "review", label: "Review Permission", icon: ShieldCheck },
    { id: "results", label: "Student Results", icon: ChartColumn },
    {id:  "logout", label: "Logout", icon: LogOut}
];

    function renderPage() {

        switch (activePage) {

            case "dashboard":
                return (
                    <>
                        <h2>Dashboard</h2>
                        <p>Welcome Admin. Manage your assessment system.</p>

                        <div className="dashboard-cards">
                            <div className="dashboard-card">
                                <h3>{admin.students.length}</h3>
                                <p>Total Students</p>
                            </div>

                            <div className="dashboard-card">
                                <h3>{admin.questionCount}</h3>
                                <p>Total Questions</p>
                            </div>

                            <div className="dashboard-card">
                                <h3>{admin.results.length}</h3>
                                <p>Total Results</p>
                            </div>

                            <div className="dashboard-card">
                                <h3>{admin.reviewEnabled ? "Enabled" : "Disabled"}</h3>
                                <p>Answer Review</p>
                            </div>
                        </div>

                        <div className="import-card">
                            <h3>Quick Actions</h3>

                            <div className="quick-actions">
                                <button onClick={() => setActivePage("import")}>
                                    Import Questions
                                </button>

                                <button onClick={() => setActivePage("students")}>
                                    Manage Students
                                </button>

                                <button onClick={() => setActivePage("results")}>
                                    View Results
                                </button>
                            </div>
                        </div>
                    </>
                );

            case "settings":
                return (
                    <section className="import-card">
                        <h2>Test Title Settings</h2>

                        <input
                            type="text"
                            value={admin.quizTitle}
                            onChange={event =>
                                admin.setQuizTitle(event.target.value)
                            }
                            placeholder="Enter quiz title"
                        />

                        <button onClick={admin.saveQuizTitle}>
                            Save Quiz Title
                        </button>

                        <Message messages={admin.messages} name="title" />
                    </section>
                );

            case "import":
                return (
                    <>

                    <section className="import-card">
                        <h2>Test Title Settings</h2>

                        <input
                            type="text"
                            value={admin.quizTitle}
                            onChange={event =>
                                admin.setQuizTitle(event.target.value)
                            }
                            placeholder="Enter quiz title"
                        />

                        <button onClick={admin.saveQuizTitle}>
                            Save Quiz Title
                        </button>

                        <Message messages={admin.messages} name="title" />
                    </section>

                        <h2>Import Questions</h2>

                        <section className="import-card">
                            <h3>Import Questions from TXT File</h3>
                            <p>Select a text file containing quiz questions.</p>

                            <input
                                type="file"
                                accept=".txt,text/plain"
                                onChange={event =>
                                    admin.setQuestionFile(
                                        event.target.files?.[0] || null
                                    )
                                }
                            />

                            {admin.questionFile && (
                                <p>
                                    Selected file: {admin.questionFile.name}
                                </p>
                            )}

                            <button
                                onClick={admin.handleTXTImport}
                                disabled={admin.loading.txt}
                            >
                                {admin.loading.txt
                                    ? "Importing..."
                                    : "Import Questions"}
                            </button>

                            <Message messages={admin.messages} name="txt" />
                        </section>

                        <section className="import-card">
                            <h3>Manually Add Questions</h3>
                            <p>Paste questions using the supported format.</p>

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
                    </>
                );

            case "questions":
                return (
                    <section className="import-card">
                        <h2>Question Management</h2>

                        <p>
                            Total Questions:{" "}
                            <strong>{admin.questionCount}</strong>
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
                );

            case "students":
                return (
                    <>
                        <h2>Student Management</h2>

                        <section className="import-card">
                            <h3>Add Student Manually</h3>

                            <form onSubmit={admin.handleAddStudent}>
                                <input
                                    type="text"
                                    name="rollNumber"
                                    placeholder="Enter student roll number"
                                />
                                <input
                                       type="email"
                                        name="email"
                                         placeholder="Enter student email address"
                                          required
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

                            <Message
                                messages={admin.messages}
                                name="addStudent"
                            />
                        </section>

                        <section className="import-card">
                            <h3>Import Students from CSV</h3>

                            <p>
                               Required columns: Roll Number, Email and Password.
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
                                    admin.setStudentCSVFile(
                                        event.target.files?.[0] || null
                                    )
                                }
                            />

                            {admin.studentCSVFile && (
                                <p>
                                    Selected file: {admin.studentCSVFile.name}
                                </p>
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

                        <section className="import-card">
                            <div className="section-heading">
                                <h3>Registered Students</h3>

                                <button
                                    onClick={admin.refreshStudents}
                                    disabled={admin.loading.students}
                                >
                                    Refresh Students
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
                    </>
                );

            case "review":
                return (
                    <section className="import-card">
                        <h2>Student Answer Review Permission</h2>

                        <p>
                            Allow students to view correct answers after
                            completing the Test.
                        </p>

                        <p>
                            Current Status:{" "}
                            <strong>
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
                );

            case "results":
                return (
                    <section className="import-card">
                       
<div className="results-header">
    <h2>Student Assessment Results</h2>

    <div className="results-header-actions">
        <button onClick={admin.refreshResults}>
            Refresh Results
        </button>

        <button
            onClick={admin.handleSendAllResultEmails}
            disabled={admin.loading.sendAllEmails}
        >
            {admin.loading.sendAllEmails
                ? "Sending..."
                : "Send All Result Emails"}
        </button>
    </div>
</div>

<div className="results-delete">
     <button
                            className="danger-button"
                            onClick={admin.handleDeleteAllResults}
                            disabled={admin.loading.deleteResults}
                        >
                            {admin.loading.deleteResults
                                ? "Deleting..."
                                : "Delete All Results"}
                        </button>
</div>


                       

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
                                        <th>Email Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {admin.results.length === 0 ? (
                                        <tr>
                                            <td colSpan="8">
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

        {/* Date */}
        <td>
            {result.createdAt
                ? new Date(result.createdAt).toLocaleString()
                : "-"}
        </td>

        {/* Email Status */}
        <td>
            {result.emailStatus || "Pending"}
        </td>

        {/* Action */}
        <td>
            <button
                onClick={() => admin.handleSendResultEmail(result)}
                disabled={
                    admin.loading.sendingResultId === result._id ||
                    result.emailStatus === "sent"
                }
            >
                {admin.loading.sendingResultId === result._id
                    ? "Sending..."
                    : result.emailStatus === "sent"
                        ? "Sent"
                        : "Send Email"}
                </button>
          </td>
       </tr>
    ))

                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Message messages={admin.messages} name="results" />
                    </section>
                );

            default:
                return <h2>Page not found</h2>;
        }
    }

    if (!admin.loggedIn) {
        return (
            <div className="admin-page">
                <header className="admin-header">
                    <a href="/" className="logo-link">
                        <img src="logo.svg" alt="Quiz Logo" className="logo" />
                    </a>
                    <a href="/" className="student-link">
                        Student Portal
                    </a>
                </header>

                <main className="admin-container">
                    <form
                        className="admin-login-card"
                        onSubmit={admin.handleAdminLogin}
                    >
                        <h2>Admin Login</h2>
                        <p>Enter your admin password to continue.</p>

                        <input
                            type="password"
                            value={admin.loginPassword}
                            onChange={event =>
                                admin.setLoginPassword(event.target.value)
                            }
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
        <div className="admin-layout">

            {/* FIXED SIDEBAR */}
            <aside className="admin-sidebar">

                <div className="sidebar-logo">
                    <img src="logo.svg" alt="Quiz Logo" />

                </div>

                <p className="sidebar-label">MAIN MENU</p>

               <nav className="sidebar-nav">
                   {menuItems.map(item => {
                          const Icon = item.icon;

                    return (
                        <button
                              key={item.id}
                                className={
                                    activePage === item.id
                                             ? "sidebar-link active"
                                       : "sidebar-link"
                                   }
                                 onClick={() => setActivePage(item.id)}
                            >
                                    <Icon size={20} strokeWidth={1.8} />
                                  <span>{item.label}</span>
                                   </button>
                                   );
                              })}
                                   </nav>

                <div className="sidebar-bottom">
                    
                    <button
                        className="sidebar-link logout-link"
                        onClick={admin.handleLogout}
                    >
                        <span></span>
                         <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="admin-main">

                <header className="admin-topbar">
                    <div>
                        <h3>
                            {menuItems.find(
                                item => item.id === activePage
                            )?.label}
                        </h3>
                        <p>Test Management System</p>
                    </div>

                    <span className="admin-profile">
                        👤 Admin
                    </span>
                </header>

                <div className="admin-content">

                    <Message
                        messages={admin.messages}
                        name="dashboard"
                    />

                    {renderPage()}

                </div>
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
