from dotenv import load_dotenv
load_dotenv()  # Must be before any langchain import

from fastapi import FastAPI
from pydantic import BaseModel
import pathlib

from agent.graph import compiled_graph
from agent.state import AgentState

app = FastAPI(title="ImageToJsonO-matic Agent", version="1.0.0")


class RunRequest(BaseModel):
    image_path: str
    job_id: str


class RunSuccess(BaseModel):
    job_id: str
    result: dict


class RunError(BaseModel):
    job_id: str
    error: str


@app.post("/run")
async def run(request: RunRequest):
    if not pathlib.Path(request.image_path).exists():
        return RunError(
            job_id=request.job_id,
            error=f"image_path does not exist: {request.image_path}",
        )

    initial_state: AgentState = {
        "image_path": request.image_path,
        "job_id": request.job_id,
        "image_base64": "",
        "discovered_schema": {},
        "extracted_data": {},
        "validation_errors": [],
        "retry_count": 0,
    }

    try:
        final_state = await compiled_graph.ainvoke(
            initial_state,
            config={"run_name": request.job_id},
        )
        return RunSuccess(job_id=request.job_id, result=final_state["extracted_data"])
    except Exception as e:
        return RunError(job_id=request.job_id, error=str(e))
