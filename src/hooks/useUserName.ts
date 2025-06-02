
import { useState, useEffect } from "react";

const USER_NAME_KEY = "user_display_name";

export const useUserName = () => {
  const [userName, setUserName] = useState("Usuário");

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_KEY);
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const updateUserName = (newName: string) => {
    setUserName(newName);
    localStorage.setItem(USER_NAME_KEY, newName);
  };

  return {
    userName,
    updateUserName,
  };
};
