import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, Check, ChefHat, ChevronDown, CircleUserRound, Clock3,
  Coffee, FileText, LayoutDashboard, LogOut, Menu as MenuIcon, Minus, Package, Plus, Search, Settings2, ShoppingBag, SlidersHorizontal,
  Sparkles, Tags, Trash2, Truck, UtensilsCrossed, Wallet, X,
} from "lucide-react";
import { api, apiError } from "./api.js";
import { useApp } from "./context.jsx";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const imageFallback = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";

function Shell({ children }) {
  const { user, cart, logout } = useApp();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const admin = user?.role === "admin";
  useEffect(() => setMobileNav(false), [location.pathname]);

  if (admin) {
    return <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileNav ? "open" : ""}`}>
        <Link className="brand admin-brand" to="/admin"><span className="brand-icon"><UtensilsCrossed size={18} /></span><span>gather<span className="brand-dot">.</span><small>ADMIN CONSOLE</small></span></Link>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-links">
          <SideLink to="/admin" icon={<LayoutDashboard size={17} />} label="Overview" end />
          <SideLink to="/admin/menu" icon={<UtensilsCrossed size={17} />} label="Menu items" />
          <SideLink to="/admin/categories" icon={<Tags size={17} />} label="Categories" />
          <SideLink to="/admin/specials" icon={<Sparkles size={17} />} label="Daily specials" />
          <SideLink to="/admin/stock" icon={<Package size={17} />} label="Inventory" />
          <SideLink to="/admin/orders" icon={<ChefHat size={17} />} label="Orders & kitchen" />
          <SideLink to="/admin/billing" icon={<Wallet size={17} />} label="Billing" />
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini"><div className="avatar">{user.name?.slice(0, 1).toUpperCase()}</div><div><b>{user.name}</b><span>Administrator</span></div></div>
          <button className="logout-btn" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><MenuIcon size={20} /></button><div className="breadcrumb">Gather <span>/</span> Admin workspace</div><div className="top-right"><span className="system-status"><i /> System live</span><div className="avatar small">{user.name?.slice(0, 1).toUpperCase()}</div></div></header>
        <div className="admin-content">{children}</div>
      </main>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    </div>;
  }
  return <>
    <header className="customer-header">
      <Link to="/" className="brand"><span className="brand-icon"><UtensilsCrossed size={18} /></span><span>gather<span className="brand-dot">.</span></span></Link>
      <nav className="customer-nav">
        <NavLink to="/menu">Menu</NavLink><NavLink to="/specials">Today’s special</NavLink>
        {user && <NavLink to="/orders">My orders</NavLink>}
      </nav>
      <div className="header-actions">
        {user && <><Link className="account-link" to={admin ? "/admin" : "/orders"}><CircleUserRound size={18} /><span>{admin ? "Admin" : user.name.split(" ")[0]}</span></Link><button className="text-button" onClick={logout}>Sign out</button></>}
        <Link className="bag-button" to="/cart"><ShoppingBag size={18} /><span>Bag</span>{cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}</Link>
      </div>
    </header>
    {children}
    <footer className="site-footer"><Link to="/" className="brand"><span className="brand-icon"><UtensilsCrossed size={17} /></span><span>gather<span className="brand-dot">.</span></span></Link><span>Good food. Better campus days.</span><span>© {new Date().getFullYear()} Campus Canteen</span></footer>
  </>;
}

function SideLink({ to, icon, label, end }) {
  return <NavLink end={end} to={to} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>{icon}<span>{label}</span></NavLink>;
}

function PageLoading() { return <div className="loading-state"><span className="spinner" /> Loading…</div>; }
function ErrorState({ error, retry }) { return <div className="error-state"><b>Couldn’t load this right now</b><span>{error}</span>{retry && <button className="button button-outline" onClick={retry}>Try again</button>}</div>; }
function EmptyState({ icon: Icon = ShoppingBag, title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function loadPopular() {
    setLoading(true); setError("");
    try { const { data } = await api.get("/menu?limit=4"); setItems(Array.isArray(data.items) ? data.items : []); }
    catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadPopular(); }, []);
  return <main>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><i /> YOUR CAMPUS, SERVED FRESH</span><h1>A better break<br />starts <em>here.</em></h1><p>Thoughtful, fresh food made for campus life. Order ahead, skip the queue, and get back to what matters.</p><div className="hero-actions"><Link className="button button-dark" to="/menu">Explore the menu <ArrowRight size={17} /></Link><Link className="button button-quiet" to="/specials">See today’s special <ArrowUpRight size={16} /></Link></div><div className="hero-proof"><span className="proof-avatars"><i>A</i><i>R</i><i>S</i></span><span><b>Made fresh every day</b><small>Good food for the whole campus</small></span></div></div>
      <div className="hero-image"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85" alt="Freshly prepared colorful campus meal" /><div className="image-note"><span className="note-icon"><Sparkles size={17} /></span><span><b>Fresh, not fast food.</b><small>Made with care, every day.</small></span></div><div className="hero-index">01 <i /> 03</div></div>
    </section>
    <section className="feature-strip"><div><span className="feature-icon"><Clock3 size={18} /></span><span><b>Order ahead</b><small>Skip the line, not the flavor</small></span></div><div><span className="feature-icon"><ChefHat size={18} /></span><span><b>Made to order</b><small>Fresh from our kitchen</small></span></div><div><span className="feature-icon"><BadgeCheck size={18} /></span><span><b>Campus favorite</b><small>Something for everyone</small></span></div></section>
    <section className="section home-menu"><div className="section-heading"><div><span className="eyebrow">A LITTLE SOMETHING GOOD</span><h2>Popular on campus</h2></div><Link className="link-arrow" to="/menu">View full menu <ArrowRight size={16} /></Link></div>
      {loading ? <PageLoading /> : error ? <ErrorState error={error} retry={loadPopular} /> : items.length ? <div className="food-grid">{items.map((item) => <FoodCard key={item._id} item={item} />)}</div> : <EmptyState title="The menu is getting ready" text="Please check back soon for fresh dishes from our kitchen." />}
    </section>
    <section className="quote-banner"><span className="quote-mark">“</span><p>Good food brings people together.<br /><em>That’s what lunch is for.</em></p><span className="quote-sign">THE GATHER KITCHEN</span></section>
  </main>;
}

function FoodCard({ item, onAdded }) {
  const { addToCart } = useApp();
  const [busy, setBusy] = useState(false);
  function add() {
    if (!item.isAvailable || item.stockQuantity === 0) return;
    setBusy(true);
    addToCart(item);
    onAdded?.();
    window.setTimeout(() => setBusy(false), 350);
  }
  return <article className="food-card"><Link className="food-image" to={`/menu/${item._id}`}><img src={item.imageUrl || imageFallback} alt={item.name} onError={(event) => { event.currentTarget.src = imageFallback; }} />{!item.isAvailable || item.stockQuantity === 0 ? <span className="sold-badge">Sold out</span> : <span className="food-category">{item.category?.name || "Fresh today"}</span>}<span className="food-plus"><ArrowUpRight size={17} /></span></Link><div className="food-info"><Link to={`/menu/${item._id}`}><h3>{item.name}</h3></Link><p>{item.description}</p><div className="food-bottom"><strong>{money(item.price)}</strong><button className="add-button" onClick={add} disabled={!item.isAvailable || item.stockQuantity === 0 || busy} aria-label={`Add ${item.name} to bag`}>{busy ? <Check size={16} /> : <Plus size={16} />}<span>{busy ? "Added" : "Add"}</span></button></div></div></article>;
}

function MenuPage({ specials = false }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  async function loadItems() {
    setLoading(true); setError("");
    try {
      const { data } = specials ? await api.get("/specials") : await api.get("/menu", { params: { search: query || undefined, category: category || undefined, limit: 100 } });
      setItems(specials ? (data.specials || []).filter((special) => special.menuItem).map((special) => ({ ...special.menuItem, price: special.specialPrice ?? special.menuItem.price, specialDescription: special.description, specialId: special._id })) : (data.items || []));
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data.categories)).catch(() => setCategories([])); }, []);
  useEffect(() => { loadItems(); }, [category, query, specials]);
  function searchSubmit(event) { event.preventDefault(); setQuery(search.trim()); }
  return <main className="page-wrap menu-page">
    <div className="page-intro"><span className="eyebrow">{specials ? "A LITTLE EXTRA GOODNESS" : "FRESH FROM OUR KITCHEN"}</span><h1>{specials ? "Today’s special" : "The menu"}</h1><p>{specials ? "A daily little something we think you’ll love." : "Made with care, ready when you are. Find your next favorite."}</p></div>
    {!specials && <div className="menu-toolbar"><form className="search-field" onSubmit={searchSubmit}><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search something delicious…" aria-label="Search menu" /><button type="submit">Search</button></form><div className="filter-pills"><button className={!category ? "selected" : ""} onClick={() => setCategory("")}>Everything</button>{categories.map((entry) => <button key={entry._id} className={category === entry._id ? "selected" : ""} onClick={() => setCategory(entry._id)}>{entry.name}</button>)}</div></div>}
    {loading ? <PageLoading /> : error ? <ErrorState error={error} retry={loadItems} /> : items.length ? <div className="food-grid menu-grid">{items.map((item) => <FoodCard key={item._id} item={item} />)}</div> : <EmptyState icon={specials ? Sparkles : Search} title={specials ? "No specials today" : "No dishes found"} text={specials ? "Check back soon for something fresh from our kitchen." : "Try another search or category. Something tasty is waiting."} action={!specials && <button className="button button-outline" onClick={() => { setSearch(""); setQuery(""); setCategory(""); }}>Clear filters</button>} />}
  </main>;
}

function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/menu/${id}`).then(({ data }) => setItem(data.item)).catch((e) => setError(apiError(e))); }, [id]);
  if (error) return <main className="page-wrap"><ErrorState error={error} /></main>;
  if (!item) return <PageLoading />;
  return <main className="page-wrap detail-page"><Link to="/menu" className="back-link"><ArrowLeft size={16} /> Back to menu</Link><div className="detail-layout"><img src={item.imageUrl || imageFallback} alt={item.name} /><div><span className="eyebrow">{item.category?.name || "FRESH FROM OUR KITCHEN"}</span><h1>{item.name}</h1><p>{item.description}</p><strong className="detail-price">{money(item.price)}</strong><p className="stock-label">{item.stockQuantity > 0 ? `${item.stockQuantity} available today` : "Currently sold out"}</p><AddDetail item={item} /></div></div></main>;
}
function AddDetail({ item }) {
  const { addToCart } = useApp();
  return <button className="button button-dark" disabled={!item.isAvailable || !item.stockQuantity} onClick={() => addToCart(item)}>Add to bag <Plus size={17} /></button>;
}

function CartPage() {
  const { cart, changeQuantity, removeFromCart, user } = useApp();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  return <main className="page-wrap cart-page"><div className="page-intro"><span className="eyebrow">GOOD CHOICES</span><h1>Your bag</h1><p>{cart.length ? "One step closer to a very good lunch." : "Your next favorite is waiting in the menu."}</p></div>
    {!cart.length ? <EmptyState title="Your bag is taking a break" text="Find something fresh, add it here, and we’ll get it started." action={<Link className="button button-dark" to="/menu">Explore the menu <ArrowRight size={16} /></Link>} /> : <div className="cart-layout"><div className="cart-items">{cart.map((item) => <article className="cart-row" key={item._id}><img src={item.imageUrl || imageFallback} alt="" /><div className="cart-row-info"><h3>{item.name}</h3><span>{money(item.price)} each</span><div className="quantity-control"><button onClick={() => changeQuantity(item._id, -1)} aria-label="Decrease quantity"><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item._id, 1)} aria-label="Increase quantity"><Plus size={13} /></button></div></div><strong>{money(item.price * item.quantity)}</strong><button className="icon-btn remove-btn" onClick={() => removeFromCart(item._id)} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button></article>)}</div>
      <aside className="summary-card"><span className="eyebrow">ORDER SUMMARY</span><h2>Almost yours.</h2><div className="summary-line"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="summary-line"><span>Tax <small>(5%)</small></span><b>{money(tax)}</b></div><div className="summary-line total"><span>Total</span><b>{money(subtotal + tax)}</b></div><p className="tax-note">Tax is calculated by the server at checkout.</p><Link className="button button-dark full-button" to="/checkout">Continue to checkout <ArrowRight size={17} /></Link><Link className="continue-link" to="/menu"><ArrowLeft size={15} /> Keep looking</Link></aside>
    </div>}
  </main>;
}

function CheckoutPage() {
  const { user, cart, clearCart } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  async function placeOrder() {
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/orders", { items: cart.map((item) => ({ menuItem: item._id, quantity: item.quantity })) });
      clearCart();
      navigate(`/confirmation/${data.order._id}`, { state: { order: data.order, bill: data.bill } });
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  if (!cart.length) return <main className="page-wrap"><EmptyState title="Your bag is empty" text="Add a dish before heading to checkout." action={<Link className="button button-dark" to="/menu">Browse menu</Link>} /></main>;
  return <main className="page-wrap cart-page"><Link to="/cart" className="back-link"><ArrowLeft size={16} /> Back to bag</Link><div className="page-intro"><span className="eyebrow">ONE LAST THING</span><h1>Ready when you are.</h1><p>Review your order, then send it to the kitchen.</p></div><div className="cart-layout"><section className="checkout-card"><span className="eyebrow">ORDER FOR</span><h2>{user?.name}</h2><p>{user?.email}</p><div className="checkout-list">{cart.map((item) => <div key={item._id} className="summary-line"><span>{item.quantity} × {item.name}</span><b>{money(item.price * item.quantity)}</b></div>)}</div><div className="payment-note"><Wallet size={18} /><div><b>Simulated payment for campus demo</b><span>No payment is collected. Your bill will show payment as pending.</span></div></div>{error && <div className="form-error">{error}</div>}<button className="button button-dark full-button" onClick={placeOrder} disabled={loading}>{loading ? <><span className="spinner light" /> Sending to kitchen…</> : <>Place order <ArrowRight size={17} /></>}</button></section><aside className="summary-card"><span className="eyebrow">YOUR TOTAL</span><h2>Freshly calculated.</h2><div className="summary-line"><span>Items</span><b>{money(subtotal)}</b></div><div className="summary-line"><span>Tax <small>(5%)</small></span><b>{money(subtotal * 0.05)}</b></div><div className="summary-line total"><span>Total</span><b>{money(subtotal * 1.05)}</b></div><p className="tax-note">Final prices and inventory are verified securely by the server.</p></aside></div></main>;
}

function ConfirmationPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [error, setError] = useState("");
  useEffect(() => { if (!order) api.get(`/orders/${id}`).then(({ data }) => setOrder(data.order)).catch((e) => setError(apiError(e))); }, [id, order]);
  if (error) return <main className="page-wrap"><ErrorState error={error} /></main>;
  if (!order) return <PageLoading />;
  return <main className="confirmation-wrap"><div className="confirm-card"><span className="confirm-icon"><Check size={28} /></span><span className="eyebrow">ORDER SENT TO THE KITCHEN</span><h1>That’s a good choice.</h1><p>Your order is in. Keep an eye on your token and we’ll let you know when it’s ready.</p><div className="token-display"><span>KITCHEN TOKEN</span><b>{order.tokenNumber}</b><small>{order.orderNumber}</small></div><div className="confirm-total"><span>Total · bill {state?.bill?.billNumber || ""}</span><b>{money(order.totalAmount)}</b></div><div className="simulated-tag">SIMULATED PAYMENT · PENDING</div><Link className="button button-dark full-button" to={`/track/${order._id}`}>Track your order <ArrowRight size={17} /></Link><Link className="continue-link" to="/menu">Back to the menu</Link></div></main>;
}

function TrackPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const fetchOrder = () => api.get(`/orders/${id}`).then(({ data }) => { if (active) { setOrder(data.order); setError(""); } }).catch((e) => { if (active) setError(apiError(e)); });
    fetchOrder();
    const timer = window.setInterval(fetchOrder, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, [id]);
  if (error && !order) return <main className="page-wrap"><ErrorState error={error} /></main>;
  if (!order) return <PageLoading />;
  const stages = ["Pending", "Confirmed", "Preparing", "Ready", "Completed"];
  const current = stages.indexOf(order.status);
  return <main className="page-wrap track-page"><div className="page-intro"><span className="eyebrow">KITCHEN TRACKER · AUTO REFRESHES</span><h1>We’re on it.</h1><p>Order {order.orderNumber} · live updates every few seconds</p></div><div className="tracking-card"><div className="token-display"><span>YOUR KITCHEN TOKEN</span><b>{order.tokenNumber}</b></div>{order.status === "Cancelled" ? <div className="cancelled-note">This order has been cancelled.</div> : <div className="timeline">{stages.map((stage, index) => <div key={stage} className={`timeline-step ${index <= current ? "done" : ""} ${index === current ? "current" : ""}`}><span>{index < current ? <Check size={16} /> : index + 1}</span><b>{stage}</b></div>)}</div>}<div className="tracking-bottom"><span>Status</span><b className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</b><span className="tracking-total">{money(order.totalAmount)}</span></div><Link className="button button-outline full-button" to={`/bills/${order._id}`}>View your bill <FileText size={16} /></Link></div></main>;
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notify } = useApp();
  async function load() {
    setLoading(true); setError("");
    try { const { data } = await api.get("/orders"); setOrders(data.orders); }
    catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function cancel(order) {
    if (!window.confirm(`Cancel order ${order.orderNumber}? Inventory will be returned.`)) return;
    try { await api.post(`/orders/${order._id}/cancel`); notify("Order cancelled"); load(); }
    catch (e) { notify(apiError(e)); }
  }
  return <main className="page-wrap orders-page"><div className="page-intro"><span className="eyebrow">YOUR TABLE, YOUR HISTORY</span><h1>My orders</h1><p>Every good meal, all in one place.</p></div>{loading ? <PageLoading /> : error ? <ErrorState error={error} retry={load} /> : orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}><div className="order-card-top"><div><span className="eyebrow">{new Date(order.createdAt).toLocaleString()}</span><h3>{order.orderNumber}</h3></div><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span></div><div className="order-summary-items">{order.items.map((item) => <span key={item.menuItem}>{item.quantity} × {item.itemNameSnapshot}</span>)}</div><div className="order-card-bottom"><span>Token <b>#{order.tokenNumber}</b> <i /> Total <b>{money(order.totalAmount)}</b></span><div><Link className="mini-link" to={`/track/${order._id}`}>Track <ArrowRight size={14} /></Link><Link className="mini-link" to={`/bills/${order._id}`}>Bill</Link>{["Pending", "Confirmed"].includes(order.status) && <button className="mini-link danger-link" onClick={() => cancel(order)}>Cancel</button>}</div></div></article>)}</div> : <EmptyState icon={UtensilsCrossed} title="Nothing cooking yet" text="Your orders will show up here after your first visit to the menu." action={<Link className="button button-dark" to="/menu">Find something good</Link>} />}</main>;
}

function BillPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/bills/${id}`).then(({ data }) => setBill(data.bill)).catch((e) => setError(apiError(e))); }, [id]);
  if (error) return <main className="page-wrap"><ErrorState error={error} /></main>;
  if (!bill) return <PageLoading />;
  const order = bill.order;
  return <main className="page-wrap bill-page"><Link className="back-link" to="/orders"><ArrowLeft size={16} /> Back to orders</Link><section className="bill-paper"><div className="bill-head"><Link to="/" className="brand"><span className="brand-icon"><UtensilsCrossed size={17} /></span><span>gather<span className="brand-dot">.</span></span></Link><span className="eyebrow">CAMPUS CANTEEN</span></div><div className="bill-title"><div><span className="eyebrow">BILL DETAILS</span><h1>{bill.billNumber}</h1></div><span className="status-pill status-pending">{bill.paymentStatus}</span></div><div className="bill-meta"><span>Order<b>{order?.orderNumber}</b></span><span>Kitchen token<b>#{order?.tokenNumber}</b></span><span>Date<b>{new Date(bill.createdAt).toLocaleDateString()}</b></span></div><div className="bill-items">{order?.items?.map((item) => <div key={item.menuItem} className="summary-line"><span>{item.itemNameSnapshot} <small>× {item.quantity}</small></span><b>{money(item.lineTotal)}</b></div>)}</div><div className="summary-line"><span>Subtotal</span><b>{money(bill.subtotal)}</b></div><div className="summary-line"><span>Tax</span><b>{money(bill.tax)}</b></div><div className="summary-line total"><span>Total</span><b>{money(bill.totalAmount)}</b></div><div className="bill-payment">Payment status: <b>{bill.paymentStatus}</b><small>{bill.paymentMethod} · no payment was collected</small></div><button className="button button-outline full-button no-print" onClick={() => window.print()}>Print bill <FileText size={16} /></button></section></main>;
}

function AdminPage() {
  const location = useLocation();
  const segment = location.pathname.split("/")[2] || "dashboard";
  if (segment === "dashboard") return <AdminDashboard />;
  if (segment === "menu") return <AdminCrud kind="menu" />;
  if (segment === "categories") return <AdminCrud kind="categories" />;
  if (segment === "specials") return <AdminCrud kind="specials" />;
  if (segment === "stock") return <AdminCrud kind="stock" />;
  if (segment === "orders") return <AdminOrders />;
  if (segment === "billing") return <AdminBilling />;
  return <Navigate to="/admin" replace />;
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError("");
    try {
      const [dashboard, orderData] = await Promise.all([api.get("/admin/dashboard"), api.get("/orders?limit=5")]);
      setData(dashboard.data); setOrders(orderData.data.orders);
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  if (loading) return <PageLoading />;
  if (error) return <ErrorState error={error} retry={load} />;
  const stats = [
    { label: "Total orders", value: data.totalOrders, icon: <ShoppingBag size={18} />, note: "All-time orders" },
    { label: "Today's sales", value: money(data.todaySales), icon: <BarChart3 size={18} />, note: "Excludes cancelled orders" },
    { label: "In the kitchen", value: data.pendingOrders, icon: <ChefHat size={18} />, note: "Orders still in progress" },
    { label: "Available dishes", value: data.availableMenuItems, icon: <UtensilsCrossed size={18} />, note: "Currently on the menu" },
  ];
  return <><div className="admin-page-heading"><div><span className="eyebrow">YOUR CANTEEN AT A GLANCE</span><h1>Good morning.</h1><p>Here’s what’s happening in the kitchen today.</p></div><button className="button button-outline" onClick={load}><SlidersHorizontal size={15} /> Refresh data</button></div><div className="stats-grid">{stats.map((stat) => <div className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><i>{stat.icon}</i></div><strong>{stat.value}</strong><small>{stat.note}</small></div>)}</div><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest orders</h2></div><Link to="/admin/orders" className="link-arrow">View all <ArrowRight size={15} /></Link></div><OrdersTable orders={orders.slice(0, 5)} /></section></>;
}

function AdminCrud({ kind }) {
  const isMenu = kind === "menu";
  const isCategory = kind === "categories";
  const isSpecial = kind === "specials";
  const endpoint = isMenu ? "/menu?available=false&limit=100" : isCategory ? "/categories" : isSpecial ? "/specials/manage?limit=100" : "/stock?limit=100";
  const label = isMenu ? "Menu items" : isCategory ? "Categories" : isSpecial ? "Daily specials" : "Inventory";
  const blank = isMenu ? { name: "", category: "", description: "", price: "", imageUrl: "", isAvailable: true } :
    isCategory ? { name: "", description: "" } :
      isSpecial ? { menuItem: "", specialDate: new Date().toISOString().slice(0, 10), specialPrice: "", description: "" } :
        { menuItem: "", quantityAvailable: "" };
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState("");
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notify } = useApp();
  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get(endpoint);
      setRows(isCategory ? data.categories : isMenu ? data.items : isSpecial ? data.specials : data.stock);
      if (isMenu || isSpecial || kind === "stock") {
        const [categoryData, itemData] = await Promise.all([api.get("/categories"), api.get("/menu?available=false&limit=100")]);
        setCategories(categoryData.data.categories); setItems(itemData.data.items);
      }
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [kind]);
  function beginEdit(row) {
    setEditId(row._id);
    if (isMenu) setForm({ name: row.name, category: row.category?._id || row.category, description: row.description || "", price: row.price, imageUrl: row.imageUrl || "", isAvailable: row.isAvailable });
    else if (isCategory) setForm({ name: row.name, description: row.description || "" });
    else if (isSpecial) setForm({ menuItem: row.menuItem?._id || row.menuItem, specialDate: new Date(row.specialDate).toISOString().slice(0, 10), specialPrice: row.specialPrice ?? "", description: row.description || "" });
    else setForm({ menuItem: row.menuItem?._id || row.menuItem, quantityAvailable: row.quantityAvailable });
    setModal(true);
  }
  function beginCreate() { setEditId(""); setForm(blank); setModal(true); }
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try {
      const payload = { ...form };
      if (isMenu) payload.price = Number(payload.price);
      if (isSpecial) { payload.specialPrice = payload.specialPrice === "" ? null : Number(payload.specialPrice); payload.specialDate = new Date(`${payload.specialDate}T00:00:00.000Z`).toISOString(); }
      if (kind === "stock") payload.quantityAvailable = Number(payload.quantityAvailable);
      const base = isMenu ? "/menu" : isCategory ? "/categories" : isSpecial ? "/specials" : "/stock";
      if (editId) await api.put(`${base}/${editId}`, payload);
      else await api.post(base, payload);
      setModal(false); notify(`${label.slice(0, -1)} ${editId ? "updated" : "created"}`); await refresh();
    } catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    const id = row._id;
    if (!window.confirm(`Permanently delete this ${isMenu ? "menu item" : isCategory ? "category" : isSpecial ? "special" : "stock record"}?`)) return;
    try { await api.delete(`${isMenu ? "/menu" : isCategory ? "/categories" : isSpecial ? "/specials" : "/stock"}/${id}`); notify("Record deleted"); refresh(); }
    catch (e) { setError(apiError(e)); }
  }
  return <><div className="admin-page-heading"><div><span className="eyebrow">MANAGE YOUR CANTEEN</span><h1>{label}</h1><p>Keep everything fresh, accurate, and ready to go.</p></div><button className="button button-dark" onClick={beginCreate}><Plus size={17} /> Add {isMenu ? "item" : isCategory ? "category" : isSpecial ? "special" : "stock"}</button></div>
    {error && <div className="inline-error">{error}<button onClick={() => setError("")}><X size={15} /></button></div>}
    <section className="admin-panel">{loading ? <PageLoading /> : rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr>{isMenu ? <><th>Dish</th><th>Category</th><th>Price</th><th>Stock</th><th>Availability</th></> : isCategory ? <><th>Category</th><th>Description</th><th>Items</th></> : isSpecial ? <><th>Special</th><th>Date</th><th>Special price</th></> : <><th>Menu item</th><th>Quantity</th><th>Updated</th></>}<th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id}>{isMenu ? <><td><div className="table-dish"><img src={row.imageUrl || imageFallback} alt="" /><span><b>{row.name}</b><small>{row.description}</small></span></div></td><td>{row.category?.name || "—"}</td><td>{money(row.price)}</td><td>{row.stockQuantity ?? 0}</td><td><span className={`status-pill ${row.isAvailable ? "status-ready" : "status-cancelled"}`}>{row.isAvailable ? "Available" : "Hidden"}</span></td></> : isCategory ? <><td><b>{row.name}</b></td><td>{row.description || "—"}</td><td>{row.itemCount ?? "—"}</td></> : isSpecial ? <><td><b>{row.menuItem?.name || "Deleted item"}</b><small className="table-sub">{row.description}</small></td><td>{new Date(row.specialDate).toLocaleDateString()}</td><td>{row.specialPrice == null ? "Regular price" : money(row.specialPrice)}</td></> : <><td><b>{row.menuItem?.name || "Deleted item"}</b></td><td><b className={row.quantityAvailable < 5 ? "low-stock" : ""}>{row.quantityAvailable}</b></td><td>{new Date(row.updatedAt).toLocaleDateString()}</td></>}<td><div className="row-actions"><button onClick={() => beginEdit(row)}>Edit</button><button className="delete-action" onClick={() => remove(row)} aria-label="Delete"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={`No ${label.toLowerCase()} yet`} text="Add your first record to get the canteen running." action={<button className="button button-dark" onClick={beginCreate}><Plus size={16} /> Add first record</button>} />}</section>
    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}><section className="modal-card"><div className="modal-head"><div><span className="eyebrow">{editId ? "MAKE A CHANGE" : "ADD SOMETHING NEW"}</span><h2>{editId ? "Edit record" : `New ${label.slice(0, -1).toLowerCase()}`}</h2></div><button className="icon-btn" onClick={() => setModal(false)} aria-label="Close"><X size={18} /></button></div><form className="form-stack" onSubmit={save}>
      {isCategory && <><label>Category name<input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Description<textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></>}
      {isMenu && <><label>Dish name<input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Category<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Choose category</option>{categories.map((c) => <option value={c._id} key={c._id}>{c.name}</option>)}</select></label><div className="form-pair"><label>Price (₹)<input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Image URL<input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" /></label></div><label>Description<textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="checkbox-label"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /> Available on the menu</label></>}
      {isSpecial && <><label>Menu item<select required value={form.menuItem} onChange={(e) => setForm({ ...form, menuItem: e.target.value })}><option value="">Choose dish</option>{items.map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label><div className="form-pair"><label>Date<input type="date" required value={form.specialDate} onChange={(e) => setForm({ ...form, specialDate: e.target.value })} /></label><label>Special price (₹)<input type="number" min="0" step="0.01" value={form.specialPrice} onChange={(e) => setForm({ ...form, specialPrice: e.target.value })} placeholder="Regular price" /></label></div><label>Description<textarea maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></>}
      {kind === "stock" && <><label>Menu item<select required value={form.menuItem} onChange={(e) => setForm({ ...form, menuItem: e.target.value })}><option value="">Choose dish</option>{items.map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label><label>Quantity available<input type="number" min="0" step="1" required value={form.quantityAvailable} onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })} /></label></>}
      {error && <div className="form-error">{error}</div>}<button className="button button-dark full-button" disabled={busy}>{busy ? "Saving…" : editId ? "Save changes" : "Create record"} <ArrowRight size={16} /></button>
    </form></section></div>}
  </>;
}

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: "", token: "", date: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notify } = useApp();
  const load = async () => {
    setLoading(true); setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const { data } = await api.get("/orders", { params });
      setOrders(data.orders);
    } catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filters.status, filters.token, filters.date]);
  async function updateStatus(order, status) {
    try { await api.patch(`/orders/${order._id}/status`, { status }); notify(`Order ${order.orderNumber} → ${status}`); load(); }
    catch (e) { setError(apiError(e)); }
  }
  return <><div className="admin-page-heading"><div><span className="eyebrow">KITCHEN QUEUE</span><h1>Orders & kitchen</h1><p>Keep every order moving and every token in sync.</p></div><button className="button button-outline" onClick={load}><SlidersHorizontal size={15} /> Refresh queue</button></div><div className="filter-row"><label><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{["Pending", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"].map((status) => <option key={status}>{status}</option>)}</select></label><label><span>Token</span><input type="number" min="1" value={filters.token} onChange={(e) => setFilters({ ...filters, token: e.target.value })} placeholder="Any token" /></label><label><span>Date</span><input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></label><button className="button button-outline filter-clear" onClick={() => setFilters({ status: "", token: "", date: "" })}>Clear filters</button></div>{error && <div className="inline-error">{error}</div>}<section className="admin-panel">{loading ? <PageLoading /> : orders.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Kitchen token</th><th>Customer & order</th><th>Items</th><th>Total</th><th>Status</th><th>Update status</th></tr></thead><tbody>{orders.map((order) => <tr key={order._id}><td><span className="kitchen-token">#{order.tokenNumber}</span></td><td><b>{order.customer?.name || "Customer"}</b><small className="table-sub">{order.orderNumber} · {new Date(order.createdAt).toLocaleString()}</small></td><td>{order.items.map((item) => `${item.quantity}× ${item.itemNameSnapshot}`).join(", ")}</td><td><b>{money(order.totalAmount)}</b></td><td><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span></td><td>{["Completed", "Cancelled"].includes(order.status) ? "—" : <select className="status-select" value={order.status} onChange={(e) => updateStatus(order, e.target.value)}>{[order.status, "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"].filter((status, index, list) => list.indexOf(status) === index).map((s) => <option key={s}>{s}</option>)}</select>}</td></tr>)}</tbody></table></div> : <EmptyState icon={ChefHat} title="The kitchen is quiet" text="Orders will land here as soon as someone places one." />}</section></>;
}

function OrdersTable({ orders }) {
  if (!orders?.length) return <EmptyState icon={ShoppingBag} title="No orders yet" text="New customer orders will appear here." />;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Token</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((o) => <tr key={o._id}><td><b>{o.orderNumber}</b><small className="table-sub">{new Date(o.createdAt).toLocaleString()}</small></td><td>{o.customer?.name || "Customer"}</td><td><span className="kitchen-token">#{o.tokenNumber}</span></td><td>{money(o.totalAmount)}</td><td><span className={`status-pill status-${o.status.toLowerCase()}`}>{o.status}</span></td></tr>)}</tbody></table></div>;
}

function AdminBilling() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notify } = useApp();
  async function load() {
    setLoading(true); setError("");
    try { const { data } = await api.get("/bills?limit=100"); setBills(data.bills); }
    catch (e) { setError(apiError(e)); }
    finally { setLoading(false); }
  }
  async function voidBill(bill) {
    if (!window.confirm(`Void bill ${bill.billNumber}? Only cancelled orders may have their bills voided.`)) return;
    try { await api.patch(`/bills/${bill._id}`, { paymentStatus: "Voided" }); notify("Bill voided"); load(); }
    catch (e) { setError(apiError(e)); }
  }
  async function deleteBill(bill) {
    if (!window.confirm(`Delete bill ${bill.billNumber}? This is only allowed for a cancelled order.`)) return;
    try { await api.delete(`/bills/${bill._id}`); notify("Bill deleted"); load(); }
    catch (e) { setError(apiError(e)); }
  }
  useEffect(() => { load(); }, []);
  return <><div className="admin-page-heading"><div><span className="eyebrow">ORDER RECORDS</span><h1>Billing</h1><p>Review bills and simulated payment status.</p></div><button className="button button-outline" onClick={load}><SlidersHorizontal size={15} /> Refresh</button></div>{error && <div className="inline-error">{error}</div>}<section className="admin-panel">{loading ? <PageLoading /> : bills.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Bill</th><th>Order</th><th>Customer</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Payment</th><th>Actions</th></tr></thead><tbody>{bills.map((bill) => <tr key={bill._id}><td><b>{bill.billNumber}</b><small className="table-sub">{new Date(bill.createdAt).toLocaleDateString()}</small></td><td>{bill.order?.orderNumber}</td><td>{bill.order?.customer?.name || "Customer"}</td><td>{money(bill.subtotal)}</td><td>{money(bill.tax)}</td><td><b>{money(bill.totalAmount)}</b></td><td><span className={`status-pill status-${bill.paymentStatus.toLowerCase()}`}>{bill.paymentStatus}</span></td><td><div className="row-actions">{bill.order?.status === "Cancelled" && bill.paymentStatus === "Pending" && <button onClick={() => voidBill(bill)}>Void</button>}{bill.order?.status === "Cancelled" && <button className="delete-action" onClick={() => deleteBill(bill)} aria-label="Delete bill"><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={Wallet} title="No bills yet" text="Bills will appear here when an order is placed." />}</section></>;
}

function RequireRole({ admin = false, children }) {
  const { user, authReady } = useApp();
  if (!authReady) return <PageLoading />;
  if (!user) return <Shell><main className="page-wrap"><div className="page-intro"><span className="eyebrow">{admin ? "ADMIN WORKSPACE" : "YOUR ACCOUNT"}</span><h1>{admin ? "Admin access required." : "Your order needs an account."}</h1><p>{admin ? "This area is restricted to authenticated administrators." : "Checkout, order history, tracking, and bills are available to authenticated customers."}</p></div><EmptyState icon={admin ? LayoutDashboard : CircleUserRound} title="Sign-in is unavailable" text="The sign-in and registration pages have been removed. This protected feature remains unavailable until an account session is provided." action={<Link className="button button-dark" to="/menu">Back to the menu <ArrowRight size={16} /></Link>} /></main></Shell>;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  if (!admin && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function App() {
  const { toast } = useApp();
  return <><Routes>
    <Route path="/" element={<Shell><Home /></Shell>} />
    <Route path="/menu" element={<Shell><MenuPage /></Shell>} />
    <Route path="/menu/:id" element={<Shell><ItemDetail /></Shell>} />
    <Route path="/specials" element={<Shell><MenuPage specials /></Shell>} />
    <Route path="/cart" element={<Shell><CartPage /></Shell>} />
    <Route path="/checkout" element={<RequireRole><Shell><CheckoutPage /></Shell></RequireRole>} />
    <Route path="/confirmation/:id" element={<RequireRole><Shell><ConfirmationPage /></Shell></RequireRole>} />
    <Route path="/track/:id" element={<RequireRole><Shell><TrackPage /></Shell></RequireRole>} />
    <Route path="/orders" element={<RequireRole><Shell><OrdersPage /></Shell></RequireRole>} />
    <Route path="/bills/:id" element={<RequireRole><Shell><BillPage /></Shell></RequireRole>} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/register" element={<Navigate to="/" replace />} />
    <Route path="/admin-login" element={<Navigate to="/" replace />} />
    <Route path="/admin/*" element={<RequireRole admin><Shell><AdminPage /></Shell></RequireRole>} />
    <Route path="*" element={<Shell><main className="page-wrap"><EmptyState title="This page wandered off" text="Let's get you back to something good." action={<Link className="button button-dark" to="/">Go home</Link>} /></main></Shell>} />
  </Routes>{toast && <div className="toast"><Check size={16} />{toast}</div>}</>;
}

export default App;
