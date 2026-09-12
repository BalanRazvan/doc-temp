from fastapi import FastAPI

# This service exists only to hold the AI API key, which cannot live in the browser.
# It is stateless and never touches the database (architecture_decisions.md §4.2).
app = FastAPI()
