export const getUserSession = () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    return { token, role };
  };
  
  export const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };
  
  export const logoutUser = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  