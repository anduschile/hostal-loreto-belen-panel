import PanelLayout from "@/layouts/PanelLayout";

export default function PanelSegmentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PanelLayout>{children}</PanelLayout>
    );
}
