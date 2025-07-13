from flask import Flask, request, render_template, render_template_string, redirect, url_for, send_from_directory, flash
import os
import pandas as pd
import tempfile
import datetime
import time
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError  # Add this import
import base64  # Add this import

def authenticate_gmail():
    """Authenticate the user and return the credentials."""
    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

# --------------------------------
# 📩 Fetch Email Criteria via Gmail API (No Changes)
# --------------------------------
def fetch_company_criteria(service, sender_email):
    """Fetch latest email from company using Gmail API."""
    try:
        results = service.users().messages().list(userId='me', q=f'from:{sender_email}').execute()
        messages = results.get('messages', [])

        if not messages:
            print("No emails found from the specified sender.")
            return []

        # Get the latest email
        msg_id = messages[0]['id']
        message = service.users().messages().get(userId='me', id=msg_id).execute()
        payload = message['payload']

        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    body = base64.urlsafe_b64decode(part['body']['data']).decode()
        else:
            body = base64.urlsafe_b64decode(payload['body']['data']).decode()

        # Parse criteria (example: "CGPA:8.0, Place:Bangalore")
        criteria_list = []
        if body:
            criteria = {}
            for line in body.split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    criteria[key.strip().lower()] = value.strip()
            criteria_list.append(criteria)

        return criteria_list

    except HttpError as error:
        print(f"An error occurred: {error}")
        return []

# --------------------------------
# ✅ New Function: Add Dynamic Company Column
# --------------------------------
def add_company_column(students_df, sender_emails, selected_students_dict):
    """Add new columns with the sender's emails and update status."""
    for sender_email in sender_emails:
        column_name = f"status_{sender_email}"
        # Create the column if it doesn't exist
        if column_name not in students_df.columns:
            students_df[column_name] = "Not Responded"
        # Only update status if we have selected students for this sender
        if sender_email in selected_students_dict:
            selected_students = selected_students_dict[sender_email]
            students_df.loc[students_df['email'].isin(selected_students['email']), column_name] = "Selected"
            students_df.loc[~students_df['email'].isin(selected_students['email']), column_name] = "Not Selected"
        else:
            # If no students selected for this sender, mark all as "Not Selected"
            students_df[column_name] = "Not Selected"

    # Save the updated Excel sheet
    students_df.to_excel("students.xlsx", index=False)
    print(f"\n✅ Excel updated with columns for sender emails: {', '.join(sender_emails)}")

# --------------------------------
# ✅ Modified Main Execution Flow
# --------------------------------

UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), "uploads")
REPORT_FOLDER = os.path.join(tempfile.gettempdir(), "reports")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORT_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = "devu_secret"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['REPORT_FOLDER'] = REPORT_FOLDER

# --- HTML templates (inline for simplicity) ---
HOME_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Students Excel</title>
  <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
  <div class="content">
    <h2>Step 1: Upload Students Excel File</h2>
    <div id="drop-area">
      <form method="post" enctype="multipart/form-data" action="{{ url_for('upload') }}" id="upload-form">
        <p style="color: #fff; margin-bottom: 20px;">Drag & Drop your Excel file here<br>or</p>
        <label for="fileElem" class="browse-label">Browse Documents</label>
        <input type="file" id="fileElem" name="students_file" accept=".xlsx" required>
        <br><br>
        <button type="submit">Upload</button>
      </form>
    </div>
    {% with messages = get_flashed_messages() %}
      {% if messages %}
        <ul style="color: #fff; text-align: center; list-style-type: none; padding: 0;">
          {% for msg in messages %}
            <li style="background-color: rgba(30,30,30,0.7); padding: 10px; margin-bottom: 5px; border-radius: 4px; max-width: 400px; margin-left: auto; margin-right: auto;">{{ msg }}</li>
          {% endfor %}
        </ul>
      {% endif %}
    {% endwith %}
  </div>
  <script src="{{ url_for('static', filename='background.js') }}"></script>
  <script src="{{ url_for('static', filename='upload.js') }}"></script>
</body>
</html>
"""

EMAILS_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enter Emails</title>
  <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
  <div class="content">
    <h2>Step 2: Enter Sender and Teacher Emails</h2>
    <div id="drop-area" style="padding: 40px 30px;">
      <form method=post action="{{ url_for('emails') }}">
        <label style="color: #fff; font-weight: bold;">Sender Email (Company Criteria Mail):</label><br>
        <small style="color: #aaa;">Enter a single sender email address.</small><br>
        <input type=text name=sender_emails required placeholder="" 
               style="width: 100%; padding: 8px; margin: 5px 0 15px; border-radius: 4px; border: 1px solid #007bff; background: rgba(255,255,255,0.9);"><br>
        
        <label style="color: #fff; font-weight: bold;">Teacher Emails (comma-separated):</label><br>
        <small style="color: #aaa;">Enter one or more teacher emails, separated by commas.</small><br>
        <input type=text name=teacher_email required placeholder="" 
               style="width: 100%; padding: 8px; margin: 5px 0 15px; border-radius: 4px; border: 1px solid #007bff; background: rgba(255,255,255,0.9);"><br>
        
        <button type=submit style="background-color: #007bff; color: white; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; width: 100%;">Next</button>
      </form>
    </div>
    {% with messages = get_flashed_messages() %}
      {% if messages %}
        <ul style="color: #fff; text-align: center; list-style-type: none; padding: 0;">
          {% for msg in messages %}
            <li style="background-color: rgba(30,30,30,0.7); padding: 10px; margin-bottom: 5px; border-radius: 4px; max-width: 400px; margin-left: auto; margin-right: auto;">{{ msg }}</li>
          {% endfor %}
        </ul>
      {% endif %}
    {% endwith %}
  </div>
  <script src="{{ url_for('static', filename='background.js') }}"></script>
</body>
</html>
"""

PROCESS_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Process Students</title>
  <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
  <div class="content">
    <h2>Step 3: Process Students</h2>
    <div id="drop-area" style="padding: 40px 30px; text-align: center;">
      <form method=post action="{{ url_for('process') }}">
        <p style="color: #fff; margin-bottom: 20px;">Click the button below to analyze student data and generate reports based on the selection criteria.</p>
        <button type=submit style="background-color: #007bff; color: white; border: none; border-radius: 4px; padding: 12px 24px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">Run Processing & Generate Report</button>
      </form>
    </div>
    {% with messages = get_flashed_messages() %}
      {% if messages %}
        <ul style="color: #fff; text-align: center; list-style-type: none; padding: 0;">
          {% for msg in messages %}
            <li style="background-color: rgba(30,30,30,0.7); padding: 10px; margin-bottom: 5px; border-radius: 4px; max-width: 400px; margin-left: auto; margin-right: auto;">{{ msg }}</li>
          {% endfor %}
        </ul>
      {% endif %}
    {% endwith %}
  </div>
  <script src="{{ url_for('static', filename='background.js') }}"></script>
</body>
</html>
"""

RESULT_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Report</title>
  <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
  <div class="content">
    <h2>Step 4: Download Report</h2>
    <div id="drop-area" style="padding: 40px 30px; text-align: center;">
      {% if report_ready %}
        <p style="color: #fff; margin-bottom: 20px;">Your report has been generated successfully! Click the button below to download.</p>
        <a href="{{ url_for('download_report', filename=report_filename) }}" style="display: inline-block; background-color: #28a745; color: white; border: none; border-radius: 4px; padding: 12px 24px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">Download Report</a>
      {% else %}
        <p style="color: #fff;">No report was generated. Please make sure there are students matching the criteria and try again.</p>
        <a href="{{ url_for('home') }}" style="display: inline-block; margin-top: 15px; background-color: #6c757d; color: white; border: none; border-radius: 4px; padding: 10px 20px; text-decoration: none; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">Back to Home</a>
      {% endif %}
    </div>
    {% with messages = get_flashed_messages() %}
      {% if messages %}
        <ul style="color: #fff; text-align: center; list-style-type: none; padding: 0;">
          {% for msg in messages %}
            <li style="background-color: rgba(30,30,30,0.7); padding: 10px; margin-bottom: 5px; border-radius: 4px; max-width: 400px; margin-left: auto; margin-right: auto;">{{ msg }}</li>
          {% endfor %}
        </ul>
      {% endif %}
    {% endwith %}
  </div>
  <script src="{{ url_for('static', filename='background.js') }}"></script>
</body>
</html>
"""

# --- In-memory session (for demo, not production) ---
SESSION = {}

@app.route("/", methods=["GET"])
def home():
    return render_template("home.html")

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("students_file")
    if not file or not file.filename.endswith(".xlsx"):
        flash("Please upload a valid Excel (.xlsx) file.")
        return redirect(url_for("home"))
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    SESSION['students_file'] = filepath
    return redirect(url_for("emails"))

@app.route("/emails", methods=["GET", "POST"])
def emails():
    if request.method == "POST":
        SESSION['sender_emails'] = [e.strip() for e in request.form["sender_emails"].split(",")]
        SESSION['teacher_email'] = request.form["teacher_email"].strip()
        return redirect(url_for("process"))
    return render_template_string(EMAILS_HTML)

@app.route("/process", methods=["GET", "POST"])
def process():
    if request.method == "POST":
        print("Processing started")  # Debug
        students_file = SESSION.get('students_file')
        sender_emails = SESSION.get('sender_emails')
        teacher_email = SESSION.get('teacher_email')
        print("students_file:", students_file)  # Debug
        print("sender_emails:", sender_emails)  # Debug
        print("teacher_email:", teacher_email)  # Debug
        if not (students_file and sender_emails and teacher_email):
            flash("Missing required information.")
            return redirect(url_for("home"))

        # Authenticate Gmail
        creds = authenticate_gmail()
        if creds is None:
            flash("Gmail authentication failed.")
            return redirect(url_for("home"))
        service = build('gmail', 'v1', credentials=creds)

        # Load students
        students_df = pd.read_excel(students_file)
        students_df = students_df.loc[:, ~students_df.columns.str.contains('^Unnamed')]
        print("Loaded students_df:", students_df.shape)  # Debug

        selected_students_dict = {}
        for sender_email in sender_emails:
            criteria_list = fetch_company_criteria(service, sender_email)
            print(f"Criteria for {sender_email}:", criteria_list)  # Debug
            if not criteria_list:
                continue
            selected_students = pd.DataFrame()
            for criteria in criteria_list:
                query_parts = []
                if "cgpa" in criteria:
                    query_parts.append(f"cgpa >= {float(criteria['cgpa'])}")
                if "place" in criteria:
                    query_parts.append(f"place == '{criteria['place']}'")
                if "sex" in criteria:
                    query_parts.append(f"sex == '{criteria['sex']}'")
                if query_parts:
                    query = " & ".join(query_parts)
                    temp_df = students_df.query(query)
                    selected_students = pd.concat([selected_students, temp_df])
            selected_students = selected_students.drop_duplicates(subset=["student_id"])
            print(f"Selected students for {sender_email}:", selected_students.shape)  # Debug
            if not selected_students.empty:
                selected_students_dict[sender_email] = selected_students

        # Add company columns
        add_company_column(students_df, sender_emails, selected_students_dict)

        # Assign exam slots
        selected_students = pd.concat(selected_students_dict.values()) if selected_students_dict else pd.DataFrame()
        print("Total selected students:", selected_students.shape)  # Debug
        exam_dates = [datetime.date(2025, 4, d) for d in range(1, 31)]
        exam_times = ["09:00 AM", "01:00 PM", "04:00 PM"]
        if not selected_students.empty:
            selected_students["exam_date"] = [exam_dates[i % len(exam_dates)] for i in range(len(selected_students))]
            selected_students["exam_time"] = [exam_times[i % len(exam_times)] for i in range(len(selected_students))]

        # Generate report
        report_filename = "selected_students_with_exams.xlsx"
        report_path = os.path.join(app.config['REPORT_FOLDER'], report_filename)
        if not selected_students.empty:
            selected_students.to_excel(report_path, index=False)
            print("Report saved at:", report_path)  # Debug
            SESSION['report_filename'] = report_filename
            flash("Report generated successfully.")
        else:
            print("No students matched criteria.")  # Debug
            SESSION['report_filename'] = None
            flash("No students matched criteria; no report generated.")

        return redirect(url_for("result"))
    return render_template_string(PROCESS_HTML)

@app.route("/result", methods=["GET"])
def result():
    report_filename = SESSION.get('report_filename')
    return render_template_string(RESULT_HTML, report_ready=bool(report_filename), report_filename=report_filename)

@app.route("/download/<filename>")
def download_report(filename):
    return send_from_directory(app.config['REPORT_FOLDER'], filename, as_attachment=True)

if __name__ == "__main__":
    app.run(port=5000, debug=True)

print("\n🎯 Process completed successfully!")
