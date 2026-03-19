import traceback
import asyncio
from main import process_meeting
from pydantic import BaseModel

class MR(BaseModel):
    text: str

try:
    process_meeting(MR(text="- test task (Rai)"))
    print("SUCCESS")
except Exception as e:
    traceback.print_exc()
