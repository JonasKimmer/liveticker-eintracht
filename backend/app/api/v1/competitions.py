from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.competition import Competition

router = APIRouter(prefix="/competitions", tags=["competitions"])


class CompetitionCreate(BaseModel):
    external_id: Optional[int] = None
    sport: str = "Football"
    title: Optional[str] = None
    short_title: Optional[str] = None
    logo_url: Optional[str] = None
    matchcenter_image_url: Optional[str] = None
    has_standings_per_matchday: bool = False
    hidden: bool = False
    position: int = 1
    source: str = "partner"


class CompetitionUpdate(BaseModel):
    title: Optional[str] = None
    short_title: Optional[str] = None
    logo_url: Optional[str] = None
    hidden: Optional[bool] = None
    position: Optional[int] = None


class CompetitionOut(BaseModel):
    id: int
    external_id: Optional[int]
    sport: str
    title: Optional[str]
    short_title: Optional[str]
    logo_url: Optional[str]
    has_standings_per_matchday: bool
    hidden: bool
    position: int
    source: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[CompetitionOut])
def get_competitions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Competition).offset(skip).limit(limit).all()


@router.get("/{competition_id}", response_model=CompetitionOut)
def get_competition(competition_id: int, db: Session = Depends(get_db)):
    c = db.query(Competition).filter(Competition.id == competition_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Competition not found")
    return c


@router.post("/", response_model=CompetitionOut, status_code=201)
def create_competition(data: CompetitionCreate, db: Session = Depends(get_db)):
    c = Competition(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{competition_id}", response_model=CompetitionOut)
def update_competition(
    competition_id: int, data: CompetitionUpdate, db: Session = Depends(get_db)
):
    c = db.query(Competition).filter(Competition.id == competition_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Competition not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{competition_id}", status_code=204)
def delete_competition(competition_id: int, db: Session = Depends(get_db)):
    c = db.query(Competition).filter(Competition.id == competition_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Competition not found")
    db.delete(c)
    db.commit()
