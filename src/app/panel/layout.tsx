import PanelLayout from "@/layouts/PanelLayout";

export default function PanelRouteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <PanelLayout>{children}</PanelLayout>;
}
