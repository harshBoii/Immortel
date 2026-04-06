import WorkspaceShell from "../../components/common/WorkspaceShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
