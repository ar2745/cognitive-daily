from typing import Any, Generic, List, Optional, Type, TypeVar
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for all repositories providing common CRUD operations.
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: UUID) -> Optional[ModelType]:
        """
        Get a single record by id.
        
        Args:
            db: Database session
            id: Record ID
            
        Returns:
            Optional[ModelType]: Found record or None
        """
        query = select(self.model).where(self.model.id == id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_or_404(self, db: AsyncSession, id: UUID) -> ModelType:
        """
        Get a single record by id or raise 404.
        
        Args:
            db: Database session
            id: Record ID
            
        Returns:
            ModelType: Found record
            
        Raises:
            HTTPException: If record not found
        """
        obj = await self.get(db, id)
        if not obj:
            raise HTTPException(status_code=404, detail=f"{self.model.__name__} not found")
        return obj

    async def list(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        **filters: Any
    ) -> List[ModelType]:
        """
        Get list of records with optional filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            **filters: Filter conditions
            
        Returns:
            List[ModelType]: List of found records
        """
        query = select(self.model)
        
        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model, field) and value is not None:
                query = query.where(getattr(self.model, field) == value)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CreateSchemaType
    ) -> ModelType:
        """
        Create a new record.
        
        Args:
            db: Database session
            obj_in: Create schema instance
            
        Returns:
            ModelType: Created record
        """
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType
    ) -> ModelType:
        """
        Update a record.
        
        Args:
            db: Database session
            db_obj: Existing database object
            obj_in: Update schema instance
            
        Returns:
            ModelType: Updated record
        """
        obj_data = obj_in.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: UUID) -> ModelType:
        """
        Delete a record.
        
        Args:
            db: Database session
            id: Record ID
            
        Returns:
            ModelType: Deleted record
            
        Raises:
            HTTPException: If record not found
        """
        obj = await self.get_or_404(db, id)
        await db.delete(obj)
        await db.commit()
        return obj 