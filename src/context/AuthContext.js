import { createContext, useState, useEffect } from 'react'
import jwt_decode from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import config from '../config.json';

const URL = config.api_url;

const AuthContext = createContext()

export default AuthContext;


export const AuthProvider = ({ children }) => {
    let [authTokens, setAuthTokens] = useState(() => localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')) : null)
    let [user, setUser] = useState(() => localStorage.getItem('authTokens') ? jwt_decode(localStorage.getItem('authTokens')) : null)
    let [loading, setLoading] = useState(false)
    let [isAdmin, setIsAdmin] = useState()
    let [loginData, setLoginData] = useState()

    const navigate = useNavigate();

    let loginUser = async (email, password) => {
        try {
            let response = await fetch(`${URL}/user/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 'email': email, 'password': password }),
            });
            let data = await response.json();
            console.log(data)
            setLoginData(data);

            if (response.status === 200) {
                setAuthTokens(data);
                setUser(jwt_decode(data.access_token));
                localStorage.setItem('authTokens', JSON.stringify(data));
            } else {
                console.log('Login failed.')
            }
            return data;
        } catch (error) {
            console.error('An error occurred during login:', error);
            alert('Something went wrong. Please try again later.');
        }
    };





    let logoutUser = () => {
        setAuthTokens(null)
        setUser(null)
        localStorage.removeItem('authTokens')
        navigate('/');
    }


    let updateToken = async () => {
        let response = await fetch(`${URL}/user/token/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'refresh': authTokens?.refresh })
        })

        let data = await response.json()
        if (response.status === 200) {
            setAuthTokens(data)
            setUser(jwt_decode(data.access_token))
            localStorage.setItem('authTokens', JSON.stringify(data))
        } else {
            logoutUser()
        }

        if (loading) {
            setLoading(false)
        }
    }

    let contextData = {
        user: user,
        authTokens: authTokens,
        loginUser: loginUser,
        logoutUser: logoutUser,
        isAdmin: isAdmin,
        loginData: loginData
    }

    useEffect(() => {
        let checkAdmin = async () => {
            if (authTokens && authTokens.access) {
                let response = await fetch(`${URL}/user/profile/me/`, {
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authTokens.access}`
                    },
                });
                let data = await response.json();
                setIsAdmin(data.user.is_admin);
            }
        };
        checkAdmin();
    }, [authTokens, loading]);
    useEffect(() => {

        if (loading) {
            updateToken()
        }

        let fourMinutes = 1000 * 60 * 20

        let interval = setInterval(() => {
            if (authTokens) {
                updateToken()
            }
        }, fourMinutes)
        return () => clearInterval(interval)

    }, [authTokens, loading])

    return (
        <AuthContext.Provider value={contextData} >
            {loading ? null : children}
        </AuthContext.Provider>
    )
}