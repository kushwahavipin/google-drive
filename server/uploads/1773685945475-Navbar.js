"use client";
import Link from "next/link";
import Button from '@mui/material/Button';
export default function HomePage() {
    return (
        <nav className="text-black bg-amber-50 p-2 flex gap-4 flex-row-reverse h-[5vh] items-center ">
            <Button variant="contained">
                <Link href="/login" className="rounded p-1">
                    Login
                </Link>
            </Button>

            <Button variant="contained">
                <Link href="/register" className="rounded p-1">
                    Register
                </Link>
            </Button>
        </nav>
    );
}