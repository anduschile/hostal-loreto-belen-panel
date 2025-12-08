
import PanelLayout from "@/layouts/PanelLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <PanelLayout>
            {children}
        </PanelLayout>
    );
}
