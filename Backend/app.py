from fastapi import FastAPI

# 1. Initialize the FastAPI application
app = FastAPI(title="Heart Failure Prediction API")

# 2. Define the basic health-check route (Acceptance Criteria)
@app.get("/")
def health_check():
    """
    Basic route to verify that the web server is running successfully.
    """
    return {
        "status": "success", 
        "message": "The FastAPI web server is running successfully on localhost!"
    }