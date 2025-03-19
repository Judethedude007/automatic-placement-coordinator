import pandas as pd
import datetime
import time
import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from base64 import urlsafe_b64encode
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import base64

# --------------------------------
# 🔑 Authentication and OAuth2 Setup
# --------------------------------
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 
          'https://www.googleapis.com/auth/gmail.send']

def authenticate_gmail():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                print("Error: 'credentials.json' file not found. Download it from Google Cloud Console.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)

        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return creds

# --------------------------------
# 📩 Fetch Email Criteria via Gmail API
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
# ✅ Main Execution Flow
# --------------------------------
creds = authenticate_gmail()
if creds is None:
    exit()

# Use the Gmail API
service = build('gmail', 'v1', credentials=creds)

# Prompt for sender email and teacher email
sender_email = input("Enter the sender email: ")
teacher_email = input("Enter the teacher email: ")

criteria_list = fetch_company_criteria(service, sender_email)

# Ensure criteria_list is not empty
if not criteria_list:
    print("\n❌ No criteria found in the email.")
    exit()

# Example criteria for female students with a CGPA of 10
criteria_list = [{"sex": "F", "cgpa": "10"}]

# --------------------------------
# ✅ Step 3: Filter Eligible Students
# --------------------------------
# ✅ Fixing Excel sheet column names issue
try:
    students_df = pd.read_excel("students.xlsx")
    students_df = students_df.loc[:, ~students_df.columns.str.contains('^Unnamed')]
    print("\n🔹 Students DataFrame Loaded Successfully")
    print(f"🔹 Columns in the Excel sheet: {students_df.columns.tolist()}")
except FileNotFoundError:
    print("\n❌ Error: 'students.xlsx' not found.")
    exit()

# Ensure column names match the Excel sheet
required_columns = {"student_id", "name", "email", "cgpa", "place"}
missing_columns = required_columns - set(students_df.columns)

if missing_columns:
    print(f"\n❌ Missing columns in Excel sheet: {missing_columns}")
    exit()

# Filter eligible students
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

# Remove duplicates
selected_students = selected_students.drop_duplicates(subset=["student_id"])

if selected_students.empty:
    print("\n❌ No students matched the criteria.")
    exit()

# --------------------------------
# 🗓️ Step 4: Assign Exam Dates/Times
# --------------------------------
exam_dates = [datetime.date(2025, 4, d) for d in range(1, 31)]
exam_times = ["09:00 AM", "01:00 PM", "04:00 PM"]

# Assign slots efficiently
selected_students["exam_date"] = [exam_dates[i % len(exam_dates)] for i in range(len(selected_students))]
selected_students["exam_time"] = [exam_times[i % len(exam_times)] for i in range(len(selected_students))]

# --------------------------------
# 📤 Step 5: Send Notifications to Students using Gmail API
# --------------------------------
def send_student_notification(service, student_email, student_name, exam_date, exam_time):
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = student_email
    message["Subject"] = "Placement Exam Schedule"

    body = f"""
    Dear {student_name},
    
    Your placement exam is scheduled on:
    Date: {exam_date}
    Time: {exam_time}
    
    Best regards,
    Placement Cell
    """
    message.attach(MIMEText(body, "plain"))

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

    try:
        service.users().messages().send(userId="me", body={"raw": raw_message}).execute()
        print(f"✅ Email sent to {student_name} ({student_email}) - {exam_date} at {exam_time}")
    except HttpError as error:
        print(f"\n❌ Error sending email to {student_email}: {error}")

# Send emails to students
for _, student in selected_students.iterrows():
    send_student_notification(
        service,
        student["email"],
        student["name"],
        student["exam_date"],
        student["exam_time"]
    )
    time.sleep(1)

# --------------------------------
# ✅ Step 6: Generate Report
# --------------------------------
report_filename = "selected_students_with_exams.xlsx"
if not selected_students.empty:
    selected_students.to_excel(report_filename, index=False)
    print(f"\n✅ Report saved as '{report_filename}'")
else:
    print("\n❌ No students to export to Excel")

# Automatically send the report to the specified teacher
def send_teacher_report(service, teacher_email):
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = teacher_email
    message["Subject"] = "Selected Students Exam Schedule"

    body = "Attached is the list of selected students and their exam schedules."
    message.attach(MIMEText(body, "plain"))

    with open(report_filename, "rb") as f:
        part = MIMEApplication(f.read(), Name=report_filename)
        part["Content-Disposition"] = f'attachment; filename="{report_filename}"'
        message.attach(part)

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw_message}).execute()

send_teacher_report(service, teacher_email)

print("\n🎯 Process completed successfully!")
