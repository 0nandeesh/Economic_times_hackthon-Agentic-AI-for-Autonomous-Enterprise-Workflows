import traceback
from backend.main import process_meeting, MeetingRequest

try:
    process_meeting(MeetingRequest(text="- test task (Rai)"))
except Exception as e:
    traceback.print_exc()
