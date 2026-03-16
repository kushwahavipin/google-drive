"use client";

import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // user = token only
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                setLoggedIn(false);
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify-token`,
                    {
                        token: token
                    },

                );

                if (res.data.valid) {
                    setLoggedIn(true);
                    console.log("Verified token:", token);
                    setUser(token);
                } else {
                    localStorage.removeItem("token");
                    setLoggedIn(false);
                    setUser(null);
                }
            } catch (error) {
                console.log(error);
                localStorage.removeItem("token");
                setLoggedIn(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        verifyUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loggedIn, setLoggedIn, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
