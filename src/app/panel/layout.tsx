import PanelLayout from "@/layouts/PanelLayout";
import PwaCacheBuster from "@/components/pwa/PwaCacheBuster";

export default function PanelRouteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PanelLayout>
            <PwaCacheBuster />
            {children}
        </PanelLayout>
    );
}
