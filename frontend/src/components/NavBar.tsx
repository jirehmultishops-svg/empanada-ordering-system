import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/">🥟 Empanadas</NavLink>
      </div>
      <div className="navbar-links">
        {isAdmin ? (
          <>
            <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}>
              Pedidos
            </NavLink>
            <NavLink to="/admin/catalog" className={({ isActive }) => isActive ? 'active' : ''}>
              Catálogo
            </NavLink>
            <NavLink to="/admin/delivery" className={({ isActive }) => isActive ? 'active' : ''}>
              Entrega
            </NavLink>
            <button className="btn-link" onClick={handleLogout} title={user?.name}>
              Salir
            </button>
          </>
        ) : (
          <>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              Menú
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/cart" className={({ isActive }) => isActive ? 'active' : ''}>
                  Carrito
                </NavLink>
                <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>
                  Pedidos
                </NavLink>
                <button className="btn-link" onClick={handleLogout} title={user?.name}>
                  Salir
                </button>
              </>
            ) : (
              <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}>
                Ingresar
              </NavLink>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
