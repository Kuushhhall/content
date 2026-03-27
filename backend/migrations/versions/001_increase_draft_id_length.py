"""Increase draft ID length from 50 to 100 characters

Revision ID: 001
Revises: 
Create Date: 2026-03-26 18:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Increase draft ID length from 50 to 100
    op.alter_column('drafts', 'id',
               existing_type=sa.String(50),
               type_=sa.String(100),
               existing_nullable=False)
    
    # Update foreign key references
    op.alter_column('schedules', 'draft_id',
               existing_type=sa.String(50),
               type_=sa.String(100),
               existing_nullable=False)
    
    op.alter_column('publish_results', 'draft_id',
               existing_type=sa.String(50),
               type_=sa.String(100),
               existing_nullable=True)


def downgrade() -> None:
    # Revert draft ID length back to 50
    op.alter_column('drafts', 'id',
               existing_type=sa.String(100),
               type_=sa.String(50),
               existing_nullable=False)
    
    # Revert foreign key references
    op.alter_column('schedules', 'draft_id',    
               existing_type=sa.String(100),
               type_=sa.String(50),
               existing_nullable=False)
    
    op.alter_column('publish_results', 'draft_id',
               existing_type=sa.String(100),
               type_=sa.String(50),
               existing_nullable=True)