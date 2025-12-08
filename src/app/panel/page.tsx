
import DashboardPage from "./dashboard/page";

export const dynamic = "force-dynamic";

export default function PanelPage(props: any) {
    // Pass props (searchParams) to DashboardPage so it works identically
    return <DashboardPage {...props} />;
}
