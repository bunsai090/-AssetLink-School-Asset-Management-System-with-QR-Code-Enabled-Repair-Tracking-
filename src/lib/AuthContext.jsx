import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, query, where, getDocs, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let unsubscribeDoc = null;
        let safetyTimeout = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (unsubscribeDoc) unsubscribeDoc();
            if (safetyTimeout) clearTimeout(safetyTimeout);

            setIsLoadingAuth(true);
            setAuthError(null);

            if (firebaseUser) {
                // Safety net: force-exit loading after 15s if Firestore never responds
                safetyTimeout = setTimeout(() => {
                    console.warn('[AuthContext] Firestore timed out — forcing sign out.');
                    signOut(auth).catch(() => {});
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoadingAuth(false);
                    setAuthError({
                        type: 'network_error',
                        message: 'Could not connect to the server. Please disable any ad blockers and try again.'
                    });
                }, 15000);

                unsubscribeDoc = onSnapshot(
                    doc(db, 'users', firebaseUser.uid),
                    async (userDoc) => {
                        // Always clear safety timeout when Firestore responds
                        if (safetyTimeout) clearTimeout(safetyTimeout);

                        try {
                            if (userDoc.exists()) {
                                const userData = userDoc.data();

                                if (userData.role === 'supervisor') {
                                    await signOut(auth);
                                    setUser(null);
                                    setIsAuthenticated(false);
                                    setAuthError({
                                        type: 'unauthorized_role',
                                        message: 'The Supervisor role has been discontinued. Please contact your administrator.'
                                    });
                                } else if (userData.is_approved === false && userData.role !== 'admin') {
                                    // Pending account — sign out silently.
                                    // The register page handles showing the pending modal via navigate state.
                                    await signOut(auth);
                                    setUser(null);
                                    setIsAuthenticated(false);
                                    // Do NOT set authError here — it would be cleared by the
                                    // subsequent onAuthStateChanged(null) call anyway.
                                } else {
                                    setUser({
                                        uid: firebaseUser.uid,
                                        email: firebaseUser.email,
                                        ...userData
                                    });
                                    setIsAuthenticated(true);
                                }
                            } else {
                                // Fallback: try to link by email
                                const q = query(
                                    collection(db, 'users'),
                                    where('email', '==', firebaseUser.email)
                                );
                                const querySnapshot = await getDocs(q);

                                if (!querySnapshot.empty) {
                                    const existingUserData = querySnapshot.docs[0].data();
                                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                                        ...existingUserData,
                                        linked_from_uid: querySnapshot.docs[0].id
                                    });
                                    // Listener will re-fire automatically after the write
                                } else {
                                    setUser(null);
                                    setIsAuthenticated(false);
                                    setAuthError({
                                        type: 'user_not_registered',
                                        message: 'Your account is not registered. Please sign up first.'
                                    });
                                }
                            }
                        } catch (err) {
                            // Any error inside the callback (e.g. signOut failing) — clean up gracefully
                            console.error('[AuthContext] onSnapshot callback error:', err);
                            setUser(null);
                            setIsAuthenticated(false);
                        } finally {
                            // CRITICAL: always release loading, no matter what
                            setIsLoadingAuth(false);
                        }
                    },
                    (error) => {
                        // Firestore connection/permission error
                        if (safetyTimeout) clearTimeout(safetyTimeout);
                        console.error('[AuthContext] Firestore listener error:', error);
                        signOut(auth).catch(() => {});
                        setUser(null);
                        setIsAuthenticated(false);
                        setIsLoadingAuth(false);
                    }
                );
            } else {
                if (safetyTimeout) clearTimeout(safetyTimeout);
                setUser(null);
                setIsAuthenticated(false);
                setAuthError(null);
                setIsLoadingAuth(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
            if (safetyTimeout) clearTimeout(safetyTimeout);
        };
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            currentUser: user,
            isAuthenticated,
            isLoadingAuth,
            // Alias so AppContainer doesn't break (it reads isLoadingPublicSettings)
            isLoadingPublicSettings: false,
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
