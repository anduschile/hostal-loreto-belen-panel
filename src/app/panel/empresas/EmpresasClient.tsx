"use client";

import { useState, useEffect } from "react";
import type { Company } from "@/types/hostal";

const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="relative bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default function EmpresasClient({
  initialCompanies,
}: {
  initialCompanies: Company[];
}) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [filteredCompanies, setFilteredCompanies] =
    useState<Company[]>(initialCompanies);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    notes: "",
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = companies.filter((item) => {
      return Object.values(item).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(lowercasedFilter)
      );
    });
    setFilteredCompanies(filteredData);
  }, [searchTerm, companies]);

  const handleOpenModal = (company: Company | null = null) => {
    setSelectedCompany(company);
    setFormData({
      name: company?.name || "",
      contact_person: company?.contact_person || "",
      phone: company?.phone || "",
      email: company?.email || "",
      notes: company?.notes || "",
      is_active: company?.is_active ?? true,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
    setErrorMessage(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const url = selectedCompany
      ? `/api/empresas/${selectedCompany.id}`
      : "/api/empresas";
    const method = selectedCompany ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response
        .json()
        .catch(() => null as any); // por si la respuesta viene sin body

      if (!response.ok) {
        const backendMessage =
          data?.error || data?.message || "Error al guardar la empresa.";
        throw new Error(backendMessage);
      }

      const savedCompany = data as Company;

      if (selectedCompany) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === savedCompany.id ? savedCompany : c))
        );
      } else {
        setCompanies((prev) => [...prev, savedCompany]);
      }

      handleCloseModal();
    } catch (error: any) {
      console.error("Error en handleSubmit:", error);
      setErrorMessage(error?.message ?? "No se pudo guardar la empresa.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta empresa?")) {
      try {
        const response = await fetch(`/api/empresas/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null as any);
          const backendMessage =
            data?.error || data?.message || "Error al eliminar la empresa.";
          throw new Error(backendMessage);
        }

        setCompanies((prev) => prev.filter((c) => c.id !== id));
      } catch (error: any) {
        console.error("Error en handleDelete:", error);
        alert(error?.message ?? "No se pudo eliminar la empresa.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Gestión de Empresas</h1>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Buscar empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg w-1/3"
        />
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          + Nueva Empresa
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.map((company) => (
              <tr key={company.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {company.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {company.contact_person}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {company.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {company.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      company.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {company.is_active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleOpenModal(company)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(company.id)}
                    className="ml-4 text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {filteredCompanies.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-gray-400 text-sm"
                >
                  No hay empresas registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {selectedCompany ? "Editar Empresa" : "Nueva Empresa"}
          </h2>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="contact_person"
              className="block text-sm font-medium text-gray-700"
            >
              Persona de Contacto
            </label>
            <input
              type="text"
              name="contact_person"
              id="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Teléfono
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notas
            </label>
            <textarea
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-900"
            >
              Activa
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
