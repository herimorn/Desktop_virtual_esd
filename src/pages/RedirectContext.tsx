import React, { createContext, useState } from 'react';

export const RedirectContext = createContext({
  redirectToLogin: false,
  setRedirectToLogin: (value: boolean) => {},
});

export const RedirectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  return (
    <RedirectContext.Provider value={{ redirectToLogin, setRedirectToLogin }}>
      {children}
    </RedirectContext.Provider>
  );
};
