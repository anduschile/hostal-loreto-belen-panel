"use client";

import React from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 min-w-[350px] relative">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>
        {children}
      </div>
    </div>
  );
}
