import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setApiToken } from "./api.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !window.sessionStorage.getItem("canteen-token"));
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!window.sessionStorage.getItem("canteen-token")) return;
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setApiToken(null))
      .finally(() => setAuthReady(true));
  }, []);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function logout() {
    setUser(null);
    setApiToken(null);
    setCart([]);
  }

  function addToCart(item) {
    let limited = false;
    setCart((current) => {
      const exists = current.find((entry) => entry._id === item._id);
      if (exists) {
        const maximum = Math.min(50, item.stockQuantity ?? 50);
        if (exists.quantity >= maximum) { limited = true; return current; }
        return current.map((entry) => entry._id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry);
      }
      if (item.stockQuantity === 0) { limited = true; return current; }
      return [...current, { ...item, quantity: 1 }];
    });
    notify(limited ? `Only ${item.stockQuantity} available today` : "Added to your bag");
  }

  function changeQuantity(id, amount) {
    let limited = false;
    setCart((current) => current.map((item) => {
      if (item._id !== id) return item;
      const maximum = Math.min(50, item.stockQuantity ?? 50);
      if (amount > 0 && item.quantity >= maximum) { limited = true; return item; }
      return { ...item, quantity: item.quantity + amount };
    }).filter((item) => item.quantity > 0));
    if (limited) notify("That’s all the stock available today");
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item._id !== id));
  }

  const value = useMemo(() => ({
    user, authReady, cart, toast, logout, notify, addToCart, changeQuantity, removeFromCart,
    clearCart: () => setCart([]),
  }), [user, authReady, cart, toast]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
