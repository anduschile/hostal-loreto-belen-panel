import { Metadata } from "next";
import GuestsLogClient from "./GuestsLogClient";

export const metadata: Metadata = {
    title: "Registro de Huéspedes | Hostal App",
    description: "Log histórico de huéspedes y acompañantes",
};

export default function GuestsLogPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Registro de Huéspedes</h1>
                <p className="text-gray-500">Historial completo de titulares y acompañantes según reservas.</p>
            </div>

            <GuestsLogClient />
        </div>
    );
}
