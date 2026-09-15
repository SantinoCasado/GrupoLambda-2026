// src/context/carritoContext.tsx
import React, { createContext, useContext, useState } from "react";

export interface ItemMenu {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: "dish" | "drink" | string;
  tiempoElaboracion: number;
  fotos: string[];
}

export interface ItemCarrito extends ItemMenu {
  cantidad: number;
}

interface CartContextProps {
  carrito: ItemCarrito[];
  agregarAlCarrito: (item: ItemMenu) => void;
  restarDelCarrito: (itemId: string) => void; // 👈 Nuevo
  eliminarDelCarrito: (itemId: string) => void;
  vaciarCarrito: () => void;
  total: number;
  tiempoEstimadoTotal: number;
}

const CartContext = createContext<CartContextProps>({} as CartContextProps);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  const agregarAlCarrito = (item: ItemMenu) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.id === item.id);
      if (existe) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
  };

  const restarDelCarrito = (itemId: string) => {
    setCarrito((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      if (item.cantidad > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, cantidad: i.cantidad - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const eliminarDelCarrito = (itemId: string) => {
    setCarrito((prev) => prev.filter((i) => i.id !== itemId));
  };

  const vaciarCarrito = () => setCarrito([]);

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const tiempoEstimadoTotal = carrito.reduce(
    (max, item) => Math.max(max, item.tiempoElaboracion),
    0
  );

  return (
    <CartContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        restarDelCarrito,
        eliminarDelCarrito,
        vaciarCarrito,
        total,
        tiempoEstimadoTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);