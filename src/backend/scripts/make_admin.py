"""Promote a user account to admin (or demote back to user).

Usage (from src/backend):
    python -m scripts.make_admin user@example.com
    python -m scripts.make_admin user@example.com --role user
"""
import argparse
import sys

from app.db.session import SessionLocal
from app.models import User


def main() -> int:
    parser = argparse.ArgumentParser(description="Set a user's role.")
    parser.add_argument("email", help="Email of the account to update")
    parser.add_argument(
        "--role",
        default="admin",
        choices=["admin", "user"],
        help="Role to assign (default: admin)",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f"[ERROR] No user found with email: {args.email}")
            return 1
        user.role = args.role
        db.commit()
        print(f"[OK] {args.email} is now '{args.role}'.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
