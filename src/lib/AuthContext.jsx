import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            // Clean up previous listener if it exists
            if (unsubscribeDoc) unsubscribeDoc();
            
            setIsLoadingAuth(true);
            setAuthError(null);

            if (firebaseUser) {
                // Real-time listener for user document
                unsubscribeDoc = onSnapshot(doc(db, "users", firebaseUser.uid), async (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // Role and Approval Logic
                        if (userData.role === 'supervisor') {
                            await signOut(auth);
                            setUser(null);
                            setIsAuthenticated(false);
                            setAuthError({ 
                                type: 'unauthorized_role', 
                                message: 'The Supervisor role has been discontinued. Please contact your administrator.' 
                            });
                        } 
                        else if (userData.is_approved === false && userData.role !== 'admin') {
                            await signOut(auth);
                            setUser(null);
                            setIsAuthenticated(false);
                            setAuthError({ 
                                type: 'unauthorized_role', 
                                message: 'Your account is currently PENDING approval. Please wait for the Principal or Admin to verify your registration.' 
                            });
                        }
                        else {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                ...userData
                            });
                            setIsAuthenticated(true);
                        }
                    } else {
                        // Fallback logic for linking accounts
                        const usersRef = collection(db, "users");
                        const q = query(usersRef, where("email", "==", firebaseUser.email));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const existingUserData = querySnapshot.docs[0].data();
                            await setDoc(doc(db, "users", firebaseUser.uid), {
                                ...existingUserData,
                                linked_from_uid: querySnapshot.docs[0].id
                            });
                            // No need to set user here, the listener will fire again
                        } else {
                            setUser(null);
                            setIsAuthenticated(false);
                            setAuthError({ 
                                type: 'user_not_registered', 
                                message: 'Your account is not registered. Please sign up first.' 
                            });
                        }
                    }
                    setIsLoadingAuth(false);
                }, (error) => {
                    console.error("Firestore Listener Error:", error);
                    setIsLoadingAuth(false);
                });
            } else {
                setUser(null);
                setIsAuthenticated(false);
                setAuthError(null);
                setIsLoadingAuth(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
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
