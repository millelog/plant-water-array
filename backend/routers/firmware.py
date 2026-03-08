# routers/firmware.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import schemas, crud
from dependencies import get_db
from typing import List
import os
import hashlib
import shutil
import json

router = APIRouter(
    prefix="/firmware",
    tags=["firmware"],
)

FIRMWARE_STORAGE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firmware_storage")


def ensure_storage_dir(version: str = None):
    path = FIRMWARE_STORAGE
    if version:
        path = os.path.join(path, version)
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/upload", response_model=schemas.FirmwareInfo)
async def upload_firmware(
    version: str = Form(...),
    notes: str = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    existing = crud.get_firmware_by_version(db, version)
    if existing:
        raise HTTPException(status_code=400, detail=f"Firmware version {version} already exists")

    version_dir = ensure_storage_dir(version)
    total_size = 0
    all_checksums = hashlib.sha256()
    file_manifest = []

    try:
        for upload_file in files:
            content = await upload_file.read()
            file_checksum = hashlib.sha256(content).hexdigest()
            file_path = os.path.join(version_dir, upload_file.filename)

            with open(file_path, "wb") as f:
                f.write(content)

            total_size += len(content)
            all_checksums.update(content)
            file_manifest.append({
                "filename": upload_file.filename,
                "checksum": file_checksum,
                "size": len(content)
            })

        # Save manifest
        manifest_path = os.path.join(version_dir, "manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(file_manifest, f)

        overall_checksum = all_checksums.hexdigest()
        filenames = ",".join(item["filename"] for item in file_manifest)

        firmware = crud.create_firmware(
            db,
            version=version,
            filename=filenames,
            checksum=overall_checksum,
            size_bytes=total_size,
            notes=notes
        )
        return firmware

    except Exception as e:
        # Clean up on failure
        if os.path.exists(version_dir):
            shutil.rmtree(version_dir)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/", response_model=List[schemas.FirmwareInfo])
async def list_firmware(db: Session = Depends(get_db)):
    return crud.get_all_firmware(db)


@router.get("/latest", response_model=schemas.FirmwareInfo)
async def get_latest_firmware(db: Session = Depends(get_db)):
    firmware = crud.get_latest_firmware(db)
    if not firmware:
        raise HTTPException(status_code=404, detail="No firmware versions available")
    return firmware


@router.get("/{version}/manifest")
async def get_firmware_manifest(version: str, db: Session = Depends(get_db)):
    firmware = crud.get_firmware_by_version(db, version)
    if not firmware:
        raise HTTPException(status_code=404, detail=f"Firmware version {version} not found")

    manifest_path = os.path.join(FIRMWARE_STORAGE, version, "manifest.json")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=404, detail="Manifest not found")

    with open(manifest_path, "r") as f:
        manifest = json.load(f)
    return {"version": version, "files": manifest}


@router.get("/{version}/files/{filename}")
async def get_firmware_file(version: str, filename: str, db: Session = Depends(get_db)):
    firmware = crud.get_firmware_by_version(db, version)
    if not firmware:
        raise HTTPException(status_code=404, detail=f"Firmware version {version} not found")

    file_path = os.path.join(FIRMWARE_STORAGE, version, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found")

    return FileResponse(file_path, filename=filename)


@router.delete("/{version}")
async def delete_firmware(version: str, db: Session = Depends(get_db)):
    firmware = crud.get_firmware_by_version(db, version)
    if not firmware:
        raise HTTPException(status_code=404, detail=f"Firmware version {version} not found")

    # Remove files
    version_dir = os.path.join(FIRMWARE_STORAGE, version)
    if os.path.exists(version_dir):
        shutil.rmtree(version_dir)

    crud.delete_firmware(db, version)
    return {"detail": f"Firmware version {version} deleted"}
