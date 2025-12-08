import { AuthProvider } from "@/contexts/AuthContext";
import PanelLayout from "@/layouts/PanelLayout";

export default function PanelSegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <PanelLayout>{children}</PanelLayout>
        </AuthProvider>
    );
}
