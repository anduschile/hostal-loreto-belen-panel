import UsuariosClient from "./UsuariosClient";

export default function UsuariosPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Usuarios</h1>
      <UsuariosClient />
    </div>
  );
}
