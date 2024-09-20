How to Run the Backend
Install Dependencies:
```
bash
pip install fastapi uvicorn sqlalchemy pydantic
```
Run the Application:

```
bash
uvicorn main:app --reload
```

API Documentation:

Once the server is running, you can access the interactive API documentation at:

```
bash
http://localhost:8000/docs
```