import os
import sys
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Add server to path
sys.path.append(os.path.join(os.getcwd(), "server"))

load_dotenv()

def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    return firestore.client()

def sync_scores():
    db = init_firebase()
    runs_ref = db.collection("test_runs")
    docs = runs_ref.stream()
    
    print("--- Starting Score Synchronization ---")
    count = 0
    for doc in docs:
        data = doc.to_dict()
        results = data.get("results", [])
        
        if not results:
            # If results array is missing, try to use summary fields
            passed = data.get("passed", 0)
            healed = data.get("healed", 0)
            total = data.get("total_tests", 0)
        else:
            passed = sum(1 for r in results if r.get("status") == "PASS")
            healed = sum(1 for r in results if r.get("status") == "HEALED")
            total = len(results)
            
        if total > 0:
            new_score = round(((passed + healed) / total) * 100, 1)
            old_score = data.get("spec_score", 0)
            
            if new_score != old_score:
                print(f"Updating Run {doc.id}: {old_score}% -> {new_score}% ({passed}+{healed}/{total})")
                runs_ref.document(doc.id).update({"spec_score": new_score})
                count += 1
            else:
                print(f"Run {doc.id} already correct: {new_score}%")
        else:
            print(f"Skipping Run {doc.id}: No tests found.")
            
    print(f"--- Synchronization Complete! Updated {count} records. ---")

if __name__ == "__main__":
    sync_scores()
