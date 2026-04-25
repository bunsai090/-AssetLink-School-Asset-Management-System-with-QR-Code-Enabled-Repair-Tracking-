import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        // Listen for Firebase Auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setIsLoadingAuth(true);
            setAuthError(null);

            if (firebaseUser) {
                try {
                    // Fetch additional user data (like role) from Firestore
                    let userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    
                    // RACE CONDITION FIX: If doc doesn't exist, wait a bit and retry once.
                    if (!userDoc.exists()) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    }

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // BLOCK SUPERVISOR ROLE
                        if (userData.role === 'supervisor') {
                            await signOut(auth);
                            setUser(null);
                            setIsAuthenticated(false);
                            setAuthError({ 
                                type: 'unauthorized_role', 
                                message: 'The Supervisor role has been discontinued. Please contact your administrator.' 
                            });
                        } else {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                ...userData
                            });
                            setIsAuthenticated(true);
                        }
                    } else {
                        // FALLBACK: Search by email if UID doesn't match 
                        const usersRef = collection(db, "users");
                        const q = query(usersRef, where("email", "==", firebaseUser.email));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const existingUserData = querySnapshot.docs[0].data();
                            
                            // Link the Google UID to the existing user record
                            await setDoc(doc(db, "users", firebaseUser.uid), {
                                ...existingUserData,
                                linked_from_uid: querySnapshot.docs[0].id
                            });

                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                ...existingUserData
                            });
                            setIsAuthenticated(true);
                        } else {
                            setUser(null);
                            setIsAuthenticated(false);
                            setAuthError({ 
                                type: 'user_not_registered', 
                                message: 'Your account is not registered. Please sign up first.' 
                            });
                        }
                    }
                } catch (error) {
                    console.error("Auth Error:", error);
                    setAuthError({ type: 'data_fetch_error', message: error.message });
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setAuthError(null);
            }
            setIsLoadingAuth(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            currentUser: user,
            isAuthenticated,
            isLoadingAuth,
            authError,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
