"""
SQLAlchemy session/engine setup.

Will contain:
- engine creation from settings.DATABASE_URL
- sessionmaker / async session setup (depending on sync vs async SQLAlchemy choice)
"""

