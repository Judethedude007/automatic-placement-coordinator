# 🚀 Automatic Placement Coordinator

Welcome to the **Automatic Placement Coordinator**!  
A smart automation tool designed to streamline campus placements by connecting recruiters, students, and faculty—all powered by Python.

---

![Placement Automation Banner](https://img.shields.io/badge/Built%20With-Python-blue?style=for-the-badge)
![License](https://img.shields.io/github/license/Judethedude007/automatic-placement-coordinator?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/Judethedude007/automatic-placement-coordinator?style=for-the-badge)

---

## 💡 What is it?

The **Automatic Placement Coordinator** automates the tedious process of student placement coordination:

- 📊 Reads student & placement data from Excel sheets
- 📧 Parses and understands company recruitment emails
- ⚡ Filters eligible students based on company criteria (CGPA, branch, etc.)
- ✉️ Notifies students and teachers via automated emails
- 🗂️ Generates Excel reports for faculty

---

## ✨ Features

- **Automated Email Parsing:** Reads emails from companies and extracts eligibility criteria.
- **Smart Filtering:** Automatically matches students to company requirements.
- **Batch Notifications:** Sends personalized emails to eligible students.
- **Faculty Reports:** Generates and dispatches summary sheets to teachers.
- **Secure Configurations:** Keeps sensitive credentials and settings safe.
- **Easy Integration:** Plug-and-play with your own datasets and email accounts.

---

## 🛠️ Tech Stack

- **Language:** Python 3.x
- **Libraries:**  
  - `pandas` (Excel handling)
  - `openpyxl` (Excel I/O)
  - `smtplib`, `imaplib` (Email handling)
  - `email` (Parsing)
  - `re` (Regex for parsing criteria)
- **Data:** Excel (.xlsx) files for student records

---

## 📦 Setup & Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/Judethedude007/automatic-placement-coordinator.git
    cd automatic-placement-coordinator
    ```

2. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Configure settings**
    - Edit `config.py` or `.env` with your email credentials and file paths.
    - Place your student data Excel file as specified in the config.

4. **Run the program**
    ```bash
    python main.py
    ```

---

## 🚦 Usage

- **Step 1:** Ensure the student dataset (Excel) is up-to-date.
- **Step 2:** The program checks for new placement emails.
- **Step 3:** It extracts criteria, filters students, and sends notifications.
- **Step 4:** Faculty receive an Excel sheet with shortlisted students.

---

## 📝 Example Student Data Format

| Name     | Student_ID | Email             | Branch | CGPA  | Sex  | ... |
|----------|------------|-------------------|--------|-------|------|-----|
| Jude     | 100123     | jude@email.com    | IT     | 8.1   | M    | ... |
| ...      | ...        | ...               | ...    | ...   | ...  | ... |

---

## 🎉 Why Use This Tool?

- **Saves Time:** Eliminates manual filtering and notifications.
- **Reduces Errors:** Consistent, criteria-based filtering.
- **Improves Communication:** No students or teachers left uninformed.
- **Highly Customizable:** Adapt to your institution’s workflow.

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to fork the repo, create issues, or submit pull requests.

---

## 📧 Contact

- **Author:** [Judethedude007](https://github.com/Judethedude007)
- **Email:** [YourEmail@example.com]

---

## ⭐️ Show Your Support

If you found this tool helpful, please ⭐️ the repository!

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).

---

**Empowering placements, one automation at a time!**

---
